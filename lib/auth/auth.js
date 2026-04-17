'use server';
import { Lucia, TimeSpan } from "lucia";
import { PostgresJsAdapter } from "@lucia-auth/adapter-postgresql";
import postgres from "postgres";
import { cookies } from "next/headers";
import dotenv from 'dotenv';

dotenv.config();

// Initialize PostgreSQL client with credentials from environment variables (singleton pattern)
let sql;

if (process.env.NODE_ENV === 'production') {
    sql = postgres({
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
        ssl: true,
        max: 2,
        idle_timeout: 20
    });
} else {
    if (!global._luciaSqlConnection) {
        global._luciaSqlConnection = postgres({
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
            ssl: false,
            max: 1,
            idle_timeout: 10
        });
    }
    sql = global._luciaSqlConnection;
}

// Initialize PostgresJsAdapter with the correct tables
const adapter = new PostgresJsAdapter(sql, {
    user: "users",
    session: "user_sessions"
});

// Initialize Lucia with the adapter and other configurations
const luciaAuth = new Lucia(adapter, {
    sessionExpiresIn: new TimeSpan(1, "h"), // 1 hour
    sessionCookie: {
        expires: false,
        attributes: {
            secure: process.env.NODE_ENV === 'production',
        },
    },
});

// Function to create authentication session
export async function createAuthSession(userId) {
    try {
        const session = await luciaAuth.createSession(userId, {});
        const sessionCookie = luciaAuth.createSessionCookie(session.id);
        const { name, value, attributes } = sessionCookie;

        const cookieStore = await cookies();
        cookieStore.set(name, value, attributes);

    } catch (error) {
        throw new Error('Session creation failed');
    }
}

// Function to verify authentication
export async function verifyAuth() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(luciaAuth.sessionCookieName);

    if (!sessionCookie) {
        console.log("No session cookie found"); // Debugging line
        return {
            user: null,
            session: null,
        };
    }

    const sessionId = sessionCookie.value;

    if (!sessionId) {
        console.log("No session ID found in the cookie"); // Debugging line
        return {
            user: null,
            session: null,
        };
    }

    const result = await luciaAuth.validateSession(sessionId);
    // console.log("Session validation result:", result); // Debugging line

    try {
        if (result.session && result.session.fresh) {
            const newSessionCookie = luciaAuth.createSessionCookie(result.session.id);
            cookieStore.set(
                newSessionCookie.name,
                newSessionCookie.value,
                newSessionCookie.attributes
            );
        }
        if (!result.session) {
            const blankSessionCookie = luciaAuth.createBlankSessionCookie();
            cookieStore.set(
                blankSessionCookie.name,
                blankSessionCookie.value,
                blankSessionCookie.attributes
            );
        }
    } catch (error) {
        console.error("Error during session validation:", error); // Debugging line
    }

    return result;
}

// Function to destroy session
export async function destroySession() {
    const { session } = await verifyAuth();
    if (!session) {
        console.log("No session found to destroy"); // Debugging line
        return {
            error: 'Unauthorized!',
        };
    }

    await luciaAuth.invalidateSession(session.id);

    const blankSessionCookie = luciaAuth.createBlankSessionCookie();
    const cookieStore = await cookies();
    cookieStore.set(blankSessionCookie.name, blankSessionCookie.value, blankSessionCookie.attributes);

    console.log("Session invalidated and cookie cleared for session:", session.id); // Debugging line
    return { success: true };
}