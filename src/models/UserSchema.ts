import { Schema, model } from "mongoose";
export interface User {
  userID: string;
  name: string;
  points: number;
  githubLink?: string;
}

// Define User schema
const userSchema = new Schema<User>({
  userID: {
    type: String,
    required: true,
    default: new Date().getMilliseconds().toString(),
  },
  name: {
    type: String,
    required: true,
  },
  points: {
    type: Number,
    default: 0,
  },
  githubLink: {
    type: String,
    unique: true,
  },
});
// Add index to the points field
userSchema.index({ points: 1 });

// Define User model based on the schema
const UserModel = model<User>("User", userSchema);
export default UserModel;
