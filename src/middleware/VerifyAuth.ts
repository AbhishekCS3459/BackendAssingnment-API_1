import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { RedisClient } from "../redis/RedisClient";

const redis_client = RedisClient.getInstance();
const jwt_secret: string = process.env.JWT_SECRET || "jwtsecret";
interface UserData {
  userId: string;
}
interface ModifiedRequest extends Request {
  userData?: UserData;
}
// Middleware to verify refresh token
async function verifyRefreshToken(
  req: ModifiedRequest,
  res: Response,
  next: NextFunction
) {
  const token: string | undefined = req.body.token;

  if (!token) {
    return res.status(401).json({ msg: "Invalid refresh token" });
  }

  try {
    const decoded: any = jwt.verify(token, jwt_secret);
    req.userData = decoded;

    const data_from_client: string | null = await redis_client.GET(
      decoded?.sub.toString()
    );

    if (!data_from_client)
      return res.status(401).json({
        status: false,
        message: "Invalid request. Token is not in store.",
      });

    if (JSON.parse(data_from_client).token !== token)
      return res.status(401).json({
        status: false,
        message: "Invalid request token, token is not same in store",
      });

    // Check if the refresh token is in the store
    next();
  } catch (error) {
    console.error("Error verifying refresh token:", error);
    return res.status(401).json({ msg: "Error in verifying refresh token" });
  }
}

// Middleware to verify access token
function verifyAccessToken(
  req: ModifiedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // const authorizationHeader: string | undefined = req.headers.authorization;

    // if (!authorizationHeader) {
    //   return res.status(401).json({ msg: "Authorization header not found" });
    // }

    // Bearer token
    // for sample testing take the token from the body
    const token: string ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWRhZmZjZTIyMDVlMjFkMTBjNzQ5YjkiLCJpYXQiOjE3MDg4NTk1MzAsImV4cCI6MTcwODk0NTkzMH0._rrMjQkBGMLMsAZ01X0ykXQ9A0Xlolb8rJEn7slSdk4";

    const decoded: any = jwt.verify(token, jwt_secret);
    req.userData = decoded;
    next();
  } catch (error) {
    console.error("Error verifying access token:", error);
    return res.status(401).json({ msg: "Error in verifying access token" });
  }
}

export { verifyAccessToken, verifyRefreshToken };
