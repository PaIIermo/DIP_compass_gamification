import { db } from 'src/lib/db'

export const handler = async (event) => {
  try {
    const { email, userId } = JSON.parse(event.body)
    console.log('Received login request:', { email, userId }) // Debug log

    // Convert userId to an integer (Prisma expects Int)
    const parsedUserId = parseInt(userId, 10)

    if (isNaN(parsedUserId)) {
      console.log('Invalid userId format')
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid user ID format - your ID should be INT',
        }),
      }
    }

    // Find the user in the database
    const user = await db.user.findUnique({
      where: { email },
      select: {
        email: true,
        lisperator_id: true,
        alias_name: true,
      },
    })

    console.log('Found user:', user)

    if (!user || user.lisperator_id !== parsedUserId) {
      console.log('Invalid login attempt')
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid email or user ID' }),
      }
    }

    console.log('Login successful:', {
      email: user.email,
      lisperator_id: user.lisperator_id,
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        user: {
          lisperator_id: user.lisperator_id,
          email: user.email,
          name: user.alias_name,
        },
      }),
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Something went wrong' }),
    }
  }
}
