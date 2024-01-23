import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const auth = asyncHandler(async (req, res, next) => {
    const accessToken = req.cookies?.accessToken || req.headers["Authorization"]?.replace("Bearer ", "");
    if(!accessToken) throw new ApiError(401, "Unauthorized request.");

    const decodedInfo = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedInfo?.id).select("-password -refreshToken");
    if(!user) throw new ApiError(401, "Inavlid access token");

    req.user = user;
    next();
})

export {auth}