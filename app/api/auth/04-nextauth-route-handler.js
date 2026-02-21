// pages/api/auth/[...nextauth].js
// This is the NextAuth API route handler
// WHY: This single endpoint handles ALL auth logic (signin, callback, signout, etc)
// NextAuth uses the [...nextauth] pattern to catch all /api/auth/* routes

import NextAuth from "next-auth";
import { authOptions } from "../../../lib/auth";

export default NextAuth(authOptions);
