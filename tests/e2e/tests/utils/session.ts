import { putInDynamo } from "./aws";
import { SNAKE_CASE_PREFIX } from "./constants";

const jwt = require("next-auth/jwt");


export async function createCookie(page, name, value) {
    return await page.evaluate((object) => {
        document.cookie = `${object.name}=${object.value};`;
    }, { name, value });
}

export async function loginAsDiscordUser(browser, email) {
    const walexDiscordId = "258012200847802369"
    await putInDynamo(`${SNAKE_CASE_PREFIX}_discord_users_${process.env.ENVIRONMENT}`, 'discord_id', walexDiscordId, {email: email, created_at: new Date().toISOString()}) 

    const page = await browser.newPage({ acceptDownloads: true })
    await page.goto(process.env.APP_URL!)
    const credentials = {
        name: 'e2e',
        email: email,
        picture: 'https://cdn.discordapp.com/avatars/258012200847802369/0d2dd5606c5bbb9b80d94027e1ebbd81.png',
        sub: '1',
        accessToken: process.env.ASK_PAPER_BYPASS_AUTH_TOKEN,
        iat: 1,
        exp: 1,
    };
    const sessionToken = await jwt.encode({ token: credentials, secret: process.env.NEXTAUTH_SECRET! })
    await createCookie(page, 'next-auth.session-token', sessionToken);
    await page.reload();
    return page
}

export async function loginAsGuest(browser, page, email) {
    page = await browser.newPage({ acceptDownloads: true })

    await page.goto(process.env.APP_URL!)

    await page.getByTestId('guest-login-input').fill(email);
    await page.getByTestId('guest-login-button').click();
    return page
}