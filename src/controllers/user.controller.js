import { User } from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadFileOnCloudinary, deleteFileFromCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { z } from "zod";
import jwt from "jsonwebtoken";

const options = {
    httpOnly: true,
    secure: true
}

const registerUser = asyncHandler(async (req, res) => {
    // console.log("req.body", req.body);
    // console.log("req.query", req.query);
    // console.log("req.params", req.params);

    //take inputs from user
    const {username, email, fullname, password} = req.body;

    //check if they are empty or improper
    if([username, email, fullname, password].some((field) => field === "")){
        throw ApiError(400, "All fields are required.");
    }
    const emailSchema = z.coerce.string().trim().email({message: "Enter a valid email"});
    const emailValidation = emailSchema.safeParse(email);
    if(!emailValidation.success) throw new ApiError(400, emailValidation.error.issues[0].message);

    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()-+=]).{8,}$/;
    const passwordSchema = z.coerce.string().trim().regex(passRegex, {message: "Enetr a valid password having 1 capital, 1 small, 1 numeric and 1 special character values."});
    const passValidation = passwordSchema.safeParse(password);
    if(!passValidation.success) throw new ApiError(400, passValidation.error.issues[0].message);

    //check if user already exists
    const existingUser = await User.findOne({
        $or: [{email}, {username}]
    })
    if(existingUser) throw new ApiError(409, "User with email and username already exists.")

    //check for avatar img
    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log(avatarLocalPath);
    if(!avatarLocalPath) throw new ApiError(400, "Avatar image is required.");

    //upload avatar file on cloudinary
    const avatarResponse = await uploadFileOnCloudinary(avatarLocalPath);
    if(!avatarResponse) throw new ApiError(500, "Avatar image was not uploaded successfully.");

    //check for cover img and upload on cloudinary
    let coverImageLocalPath
    if(req.files && req.files.coverImage && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    const coverImageResponse = await uploadFileOnCloudinary(coverImageLocalPath);

    //create user object to store in db.
    const userObj = {
        username: username.toLowerCase(),
        email,
        fullname,
        password,
        avatar: avatarResponse.url,
        avatarPublicId: avatarResponse.public_id,
        coverImage: coverImageResponse?.url || "",
        coverImagePublicId: coverImageResponse.public_id,
    }

    //save in db
    const user = await User.create(userObj);

    //check if user created/not, also select fields that you want to send back to user in response.
    const createdUser = await User.findById(user._id).select("-password -refreshToken -avatarPublicId -coverImagePublicId"); //select method takes fields that you want to unselect as i/p.

    if(!createdUser) throw new ApiError(500, "Something went wrong while creating the user.")

    const response = new ApiResponse(201, createdUser, "User created successfully.");
    return res.status(response.statusCode).json({user: response.data, message: response.message, isSuccess: response.success});
})

const loginUser = asyncHandler(async(req, res) => {
    // take user inputs
    const { username, email, password } = req.body;

    // validation inputs incase null/empty
    if(!username && !email) {
        console.log("1");
        throw new ApiError(400, "Enter a valid username or email");
    }

    // check for user with given username or email
    const user = await User.findOne({$or: [{username}, {email}]});
    if(!user){
        console.log("2");
        throw new ApiError(404, "User with given email, username not found.");
    }

    // if found check for password
    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if(!isPasswordCorrect) {console.log("3"); throw new ApiError(400, "Incorrect Password..");}

    // if all well generate access/refresh tokens
    const { accessToken, refreshToken } = await generateAccessandRefreshToken(user);

    // send response to user
    const loggedInUser = await user.select("-password -refreshToken")
    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {loggedInUser}, "User logged in Successfully")
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    const user = req.user;
    await User.findByIdAndUpdate(
        user._id,
        { $set: { refreshToken: undefined } },
        { new: true }
    );
    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully."));
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    // take old token from user and check for null value
    const oldRefreshToken = req.cookies?.refreshToken || req.headers["Authorization"]?.replace("Bearer ", "");
    if(!oldRefreshToken) throw new ApiError(401, "Unauthorized request. No refresh token found.");

    // extract info from token to get valid user and handle if no user found.
    const decodedInfo = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedInfo?.id ?? null);
    if(!user) throw new ApiError(401, "Invalid refresh token.");

    // check if old value and the existing value of refresh token in db match/not.
    if(oldRefreshToken !== user.refreshToken) throw new ApiError(401, "Refresh token has expired.");

    // create and set new token values and send response.
    const {accessToken, refreshToken} = await generateAccessandRefreshToken(user);

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, "Tokens refreshed successfully."));
})

const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if(!oldPassword || !newPassword) throw new ApiError(400, "Empty password fields. Provide valid passwords.");

    const user = req.user;

    const loggedInUser = await User.findById(user._id);
    const isPasswordCorrect = await loggedInUser.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect) throw new ApiError(400, "Invalid old password.");

    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()-+=]).{8,}$/;
    const passwordSchema = z.coerce.string().trim().regex(passRegex, {message: "Enetr a valid password having 1 capital, 1 small, 1 numeric and 1 special character values."});
    const passValidation = passwordSchema.safeParse(newPassword);
    if(!passValidation.success) throw new ApiError(400, passValidation.error.issues[0].message);

    loggedInUser.password = newPassword;
    await loggedInUser.save({validateBeforeSave: false});

    return res.status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
})

const getCurrentUser = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    return res.status(200).json(new ApiResponse(200, currentUser, "Current user fetched successfully."));
})

const updateUserInfo = asyncHandler(async(req, res) => {
    const{ username, email, fullname } = req.body;
    if(!username || !email || !fullname) throw new ApiError(400, "Please peovide non-empty fields to update.");

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            username,
            email,
            fullname
        }
    }, {new: true})
    .select("-password -refreshToken -avatarPublicId -coverImagePublicId");

    res.status(200).json(new ApiResponse(200, user, "User data updated successfully."))
})

const updateAvatarImage = asyncHandler(async(req, res) => {
    // get file path of image provided
    const avatarImagePath = req.file?.path;
    if(!avatarImage) throw new ApiError(400, "Avatar image is required.");

    // upload image on cloudinary
    const avatarImage = await uploadFileOnCloudinary(avatarImagePath);
    if(!avatarImage?.url) throw new ApiError(500, "Something went wrong. Avatar image could not be uploaded.");

    // delete old image
    const isDeleted = await deleteFileFromCloudinary(req.user?.avatarPublicId);
    if(isDeleted?.result !== 'ok') throw new ApiError(500, "Failed to delete old avatar image");

    // update url and public_id of new image uploaded into userobj in db
    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            avatar: avatarImage.url,
            avatarPublicId: avatarImage.public_id
        },
    }, {new: true})
    .select("-password -refreshToken -avatarPublicId -coverImagePublicId");

    // return response to user
    return res.status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
})

const updateCoverImage = asyncHandler(async(req, res) => {
    // get file path of image provided
    const coverImagePath = req.file?.path;
    if(!coverImagePath) throw new ApiError(400, "Cover image is required.");

    // upload image on cloudinary
    const coverImage = await uploadFileOnCloudinary(coverImagePath);
    if(!coverImage?.url) throw new ApiError(500, "Something went wrong. Cover image could not be uploaded.");

    // delete old image
    const isDeleted = await deleteFileFromCloudinary(req.user?.coverImagePublicId);
    if(isDeleted?.result !== 'ok') throw new ApiError(500, "Failed to delete old cover image");

    // update url and public_id of new image uploaded into userobj in db
    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            coverImage: coverImage.url,
            coverImagePublicId: coverImage.public_id
        },
    }, {new: true})
    .select("-password -refreshToken -avatarPublicId -coverImagePublicId");

    // return response to user
    return res.status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
})

async function generateAccessandRefreshToken (user) {
    try {
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // console.log("older" , user.refreshToken);
        // console.log("newer",refreshToken);

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrong.")
    }
}

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateUserInfo,
    updateAvatarImage,
    updateCoverImage
}