import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { query } from "@/lib/db"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        try {
          const result = await query(`SELECT * FROM users WHERE username = $1`, [credentials.username])

          const user = result[0]

          if (!user) {
            console.log("No user found with username:", credentials.username)
            return null
          }

          const passwordMatch = await bcrypt.compare(credentials.password, user.password)

          if (!passwordMatch) {
            console.log("Password does not match for user:", credentials.username)
            return null
          }

          return {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          }
        } catch (error) {
          console.error("Error during authentication:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
