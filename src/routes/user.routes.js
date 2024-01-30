import { Router } from "express";
import
{
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatarImage,
    updateCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", upload.fields([{name: 'avatar', maxCount: 1}, {name: 'coverImage', maxCount: 1}]), registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);

// authenticated routes
router.post("/logout", auth, logoutUser);
router.post("/change-password", auth, changePassword);
router.get("/get-current-user", auth, getCurrentUser);
router.put("/update-user-info", auth, updateAccountDetails);
router.put("/update-user-avatar", auth, updateAvatarImage);
router.put("/update-user-cover-image", auth, updateCoverImage);
router.get("/channel/:username", auth, getUserChannelProfile);
router.get("/history", auth, getUserWatchHistory);

export default router;