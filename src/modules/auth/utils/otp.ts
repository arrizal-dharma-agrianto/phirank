import crypto from "crypto";

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString()

const hashOtp = (email: string, otp: string) => crypto
  .createHash("sha256")
  .update(`${email}:${otp}`)
  .digest("hex")

export {
  generateOtp,
  hashOtp,
}
