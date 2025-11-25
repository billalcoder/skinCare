import User from '../models/User.js';
import Session from '../models/Session.js';
import { sendOTP } from '../utils/emailService.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRegistrationSchema } from '../validation/userInputScan.js';

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register user
export const register = async (req, res) => {
  try {
    const { data, error, success } = userRegistrationSchema.safeParse(req.body)
    if(!success) res.status(401).json({error })

    const { name, email, age, gender, skinType, allergies, concerns } = data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create new user
    const user = new User({
      name,
      email,
      age,
      gender,
      skinType,
      allergies: allergies || [],
      concerns: concerns || [],
      otp: {
        code: otpCode,
        expiresAt: otpExpires
      }
    });

    await user.save();

    // Send OTP email
    // await sendOTP(email, otpCode, name);

    res.status(201).json({
      message: 'Registration successful. OTP sent to your email.',
      userId: user._id
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.otp || user.otp.code !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Mark user as verified and clear OTP
    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    res.json({ message: 'OTP verified successfully' });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isVerified) {
      return res.status(400).json({ error: 'Please verify your email first' });
    }

    // Generate session token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Create session
    const session = new Session({
      userId: user._id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    });

    await session.save();

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        skinType: user.skinType,
        concerns: user.concerns
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
  console.log(token);
    if (token) {
      const a = await Session.findOneAndDelete({ token });
      console.log(a);
    }

    res.json({ message: 'Logout successful' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};