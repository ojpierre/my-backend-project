"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcrypt"); // Import bcrypt for password hashing

module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    static associate(models) {
      // Define associations here
      Admin.hasMany(models.Post, { foreignKey: "adminId" });
    }

    // Custom method to compare passwords
    comparePassword(password) {
      return bcrypt.compareSync(password, this.password);
    }
  }

  Admin.init(
    {
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        set(value) {
          // Hash the password before saving
          const hashedPassword = bcrypt.hashSync(value, 10);
          this.setDataValue("password", hashedPassword);
        },
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "admin", // Set the default role to "admin"
      },
    },
    {
      sequelize,
      modelName: "Admin",
    }
  );

  return Admin;
};
