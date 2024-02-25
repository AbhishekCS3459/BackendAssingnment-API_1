import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./VerifyAuth";
interface UserData {
  userId: string;
}
interface ModifiedRequest extends Request {
  userId: string;
  userData: UserData;
}

const authenticateUser = (
  req: ModifiedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Call verifyAccessToken middleware to check the access token
    verifyAccessToken(req, res, () => {
      // If token is valid, set userId in request object
      req.userId = req.userData.userId;
      next();
    });
  } catch (error) {
    console.error("Error in authenticateUser middleware:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export default authenticateUser;
