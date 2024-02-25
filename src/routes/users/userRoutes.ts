import { Request, Response, Router } from "express";
import { string, z } from "zod";
import UserModel from "../../models/UserSchema";
import { KafkaProducer } from "../../kafka/KafkaProducer";
import { RedisClient } from "../../redis/RedisClient";

const router: Router = Router();

// Define Zod schema for user creation
const validateUser = z.object({
  user: z.object({
    name: z
      .string()
      .min(3, {
        message: "Name should be at least 3 characters long",
      })
      .max(50, {
        message: "Name should not exceed 50 characters",
      }),
    githubLink: z
      .string()
      .regex(/^(https?:\/\/)?(www\.)?github.com\/[a-zA-Z0-9-]+\/?$/, {
        message: "Invalid github link",
      }),
  }),
});
const validateBulkUsers = z.array(
  z.object({
    user: z.object({
      name: z.string().min(3).max(50),
      githubLink: z
        .string()
        .regex(/^(https?:\/\/)?(www\.)?github.com\/[a-zA-Z0-9-]+\/?$/),
    }),
  })
);

// validate id as zod
const validateID = z.object({
  id: string(),
});
router.get("/test", (req, res) => [res.send("test")]);

// create a user
router.post("/newuser", async (req: Request, res: Response) => {
  try {
    const validatedData = validateUser.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ err: validatedData.error });
    }
    // get the data form the validatedData
    const { name, githubLink } = validatedData.data.user;
    // try to find if user exists
    const ExistingUser = await UserModel.findOne({ githubLink: githubLink });
    if (ExistingUser) {
      return res.status(400).json({
        message: `User already exists with user id ${ExistingUser.id} `,
      });
    }
    const newUser = {
      name,
      githubLink,
    };
    const user = new UserModel(newUser);
    await user.save();
    res.status(201).send(user);
  } catch (error) {
    console.log("error in creating user", error);
    res.json({ error: error });
  }
});

router.post("/newusers", async (req: Request, res: Response) => {
  try {
    const validatedData = validateBulkUsers.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ err: validatedData.error });
    }
    const users = validatedData.data.map((userData: any) => ({
      name: userData.user.name,
      githubLink: userData.user.githubLink,
    }));
    // // Extract GitHub links from the users array
    const githubLinks = users.map((user) => user.githubLink);
    // // Find existing users
    const existingUsers = await UserModel.find({
      githubLink: { $in: githubLinks },
    });

    // // Identify duplicate GitHub links
    const existingGithubLinks = existingUsers.map((user) => user.githubLink);
    // // Filter out duplicate users
    const uniqueUsers = users.filter(
      (user) => !existingGithubLinks.includes(user.githubLink)
    );

    // // Insert unique users
    const insertedUsers = await UserModel.insertMany(uniqueUsers);

    // Prepare response
    const response = {
      createdUsers: insertedUsers,
      duplicateUsers: existingUsers,
    };

    res.status(201).json(response);
  } catch (error) {
    console.log("Error in creating users:", error);
    res.status(500).json({ error: error });
  }
});

// Retrieve users in ascending order of points
router.get("/getusers", async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find().sort({ points: -1 });
    res.send(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update user details
router.patch("/updateUser/:id", async (req: Request, res: Response) => {
  try {
    // validate the id form the prams
    const parsedParams = validateID.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ err: parsedParams.error });
    }
    const { id } = parsedParams.data;

    const { user } = req.body;
    if (!user) return res.status(400).json({ err: "user is required" });
    // Find user by ID
    const oldUser = await UserModel.findById(id);
    if (!oldUser) {
      return res.status(404).send({ message: "User not found" });
    }

    // // Update user details
    if (user.name) oldUser.name = user.name;
    if (user.githubLink) oldUser.githubLink = user.githubLink;
    if (user.points) oldUser.points = user.points;

    // // // Save updated user
    await oldUser.save();

    // // Return updated user
    res.send(user);
  } catch (error) {
    console.log("Error in updating user:", error);
    res.status(500).send(error);
  }
});

// Delete a user
router.delete("/deleteUser/:id", async (req: Request, res: Response) => {
  try {
    const parsedParams = validateID.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ err: parsedParams.error });
    }

    const { id } = parsedParams.data;
    const user = await UserModel.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    res.send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update user points when liked by another user
// router.post("/userslike/:id", async (req: Request, res: Response) => {
//   try {
//     const parsedParams = validateID.safeParse(req.params);
//     if (!parsedParams.success) {
//       console.log("error in validating id", parsedParams);
//       return res.status(400).json({ err: parsedParams.error });
//     }

//     const { id } = parsedParams.data;
//     const user = await UserModel.findById(id);

//     if (!user) {
//       console.log("user not found");
//       return res.status(404).send({ message: "User not found" });
//     }

//     // Increase user points
//     user.points += 1;
//     if (user.points > 100) user.points = 100;
//     // Save user with optimistic locking
//     const updatedUser = await UserModel.findOneAndUpdate(
//       { _id: id, __v: user.__v },
//       { $inc: { points: 1 }, $set: { __v: user.__v + 1 } },
//       { new: true }
//     );
//     if (!updatedUser) {
//       // Handle optimistic locking conflict
//       return res
//         .status(409)
//         .send({ message: "Conflict: User data has been modified" });
//     }
//     const message = JSON.stringify({
//       userId: updatedUser._id,
//       points: updatedUser.points,
//     });

//     const KafkaClient = KafkaProducer.getKafkaInstance("proelevate");
//     const TOPIC: string = "like_events";
//     await KafkaClient.ProduceKafka(TOPIC, message);
//     res.json({ msg: "user liked and points updated" });
//   } catch (error) {
//     res.status(500).send(error);
//   }
// });


// Update user points when liked by another users
router.post("/userslike/:id", async (req: Request, res: Response) => {
  try {
    const parsedParams = validateID.safeParse(req.params);
    if (!parsedParams.success) {
      console.log("error in validating id", parsedParams);
      return res.status(400).json({ err: parsedParams.error });
    }

    const { id } = parsedParams.data;

    // Check if user data is available in cache
    const redisClient = RedisClient.getInstance();
    const cachedUserData = await redisClient.GET(id);

    let user;

    if (cachedUserData) {
      // User data found in cache, update points directly
      user = JSON.parse(cachedUserData);
      user.points += 1;
      if (user.points > 100) user.points = 100;

      // Update cache with updated user data
      await redisClient.Cache_Value(id, JSON.stringify(user));
    } else {
      // User data not in cache, fetch from DB
      user = await UserModel.findById(id);

      if (!user) {
        console.log("user not found");
        return res.status(404).send({ message: "User not found" });
      }

      // Increase user points
      user.points += 1;
      if (user.points > 100) user.points = 100;

      // Save user with optimistic locking
      const updatedUser = await UserModel.findOneAndUpdate(
        { _id: id, __v: user.__v },
        { $inc: { points: 1 }, $set: { __v: user.__v + 1 } },
        { new: true }
      );

      if (!updatedUser) {
        // Handle optimistic locking conflict
        return res.status(409).send({ message: "Conflict: User data has been modified" });
      }

      // Update cache with fetched user data
      await redisClient.Cache_Value(id, JSON.stringify(updatedUser));
    }

    // Produce Kafka message
    const message = JSON.stringify({
      userId: user._id,
      points: user.points,
    });

    const KafkaClient = KafkaProducer.getKafkaInstance("proelevate");
    const TOPIC: string = "like_events";
    await KafkaClient.ProduceKafka(TOPIC, message);

    res.json({ msg: "user liked and points updated" });
  } catch (error) {
    res.status(500).send(error);
  }
});
export default router;
