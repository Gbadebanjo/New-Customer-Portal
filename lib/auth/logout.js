'use server'

import {destroySession} from "@/lib/auth/auth";

export default async function logout() {
    await destroySession();
}
