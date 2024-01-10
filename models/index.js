const express = require("express");
const bodyParser = require("body-parser");
const swaggerUi = require("swagger-ui-express");
const swaggerJSDoc = require("swagger-jsdoc");
const { sequelize } = require("./models");
const jwt = require("jsonwebtoken");
const { User, Admin, hashPassword, comparePasswords } = require("./models");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Swagger API documentation setup
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Node.js Authentication API",
      version: "1.0.0",
      description: "API documentation for the Node.js Authentication System",
    },
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

// Start the server
app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);

  try {
    // Check if the database connection is successful
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
});

// User registration endpoint
app.post("/register", async (req, res) => {
  try {
    // Validate and sanitize user input
    const { username, email, password, role } = req.body;

    // Create user in the database (assuming you have a User model)
    const newUser = await User.create({
      username,
      email,
      password: hashPassword(password),
      role: role || "user", // set a default role if not provided
    });

    // Respond with success message or user details
    res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering user" });
  }
});

// User login endpoint
app.post("/login", async (req, res) => {
  try {
    // Validate user input
    const { email, password } = req.body;

    // Check if the user exists
    const user = await User.findOne({ where: { email } });

    if (!user || !comparePasswords(password, user.password)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      "your-secret-key",
      { expiresIn: "1h" }
    );

    // Respond with the token
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in" });
  }
});

// Authorization middleware
function authorize(role) {
  return async (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - Missing token" });
    }

    try {
      const decodedToken = jwt.verify(token, "your-secret-key");
      const userId = decodedToken.userId;

      // Check user role based on the provided model
      let userModel;
      if (role === "admin") {
        userModel = Admin;
      } else {
        userModel = User;
      }

      const user = await userModel.findByPk(userId);

      if (!user || user.role !== role) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
  };
}

// Example usage with protected route for admin
app.get("/admin-dashboard", authorize("admin"), (req, res) => {
  res.json({ message: "Welcome to the admin dashboard", user: req.user });
});

// Example usage with protected route for regular user
app.get("/user-dashboard", authorize("user"), (req, res) => {
  res.json({ message: "Welcome to the user dashboard", user: req.user });
});
