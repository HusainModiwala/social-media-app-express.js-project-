import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, updateUserInfo, updateAvatarImage, updateCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", upload.fields([{name: 'avatar', maxCount: 1}, {name: 'coverImage', maxCount: 1}]), registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);

// authenticated routes
router.post("/logout", auth, logoutUser);
router.post("/change-password", auth, changePassword);
router.post("/get-current-user", auth, getCurrentUser);
router.post("/update-user-info", auth, updateUserInfo);
router.post("/update-user-avatar", auth, updateAvatarImage);
router.post("/update-user-cover-image", auth, updateCoverImage);

export default router;