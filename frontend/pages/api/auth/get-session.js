import NextCors from 'nextjs-cors';


import { decode } from 'next-auth/jwt';
export default async function handler(request, response) {

    await NextCors(request, response, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    const sessionToken = request.headers['session-token'];
    try {
        const decoded = await decode({
            token: sessionToken,
            secret: process.env.NEXTAUTH_SECRET,
        });
        response.status(200).json(decoded);
    } catch (e) {
        response.status(401).json({ error: 'Unable to decode token' });
    }
}