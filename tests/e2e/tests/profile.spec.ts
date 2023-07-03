import { Page, expect, test } from '@playwright/test';
const jwt = require("next-auth/jwt");
var crypto = require("crypto");
var fs = require('fs')
var id = crypto.randomUUID();
const TEST_EMAIL = ((process.env.ENVIRONMENT ?? 'local') + "-" + id) + '@e2e.test';

test.describe.configure({ mode: 'serial' });

let page: Page

async function createCookie(page, name, value) {
    return await page.evaluate((object) => {
        document.cookie = `${object.name}=${object.value};`;
    }, { name, value });
}

async function loadSession(browser) {
    page = await browser.newPage({ acceptDownloads: true })
    const credentials = {
        name: 'e2e',
        email: TEST_EMAIL,
        picture: 'https://cdn.discordapp.com/avatars/258012200847802369/0d2dd5606c5bbb9b80d94027e1ebbd81.png',
        sub: '1',
        accessToken: process.env.ASK_PAPER_BYPASS_AUTH_TOKEN,
        iat: 1,
        exp: 1,
    };
    const sessionToken = jwt.encode({token: credentials, secret: process.env.NEXTAUTH_SECRET!, maxAge: 3600})
    await createCookie(page, 'next-auth.session-token', sessionToken);
}

function normalizeUrl(url) {
    return url.replace(/([^:]\/)\/+/g, "$1");
}

export async function mockRequestedUrl(page, routeToMock, mock) {
    await page.route(routeToMock, async (route) => {
        try {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mock),
            });
        } catch (error) {
            console.error('Error fulfilling mock route:', error);
            route.abort();
        }
    });
}

test.describe.skip('when testing profile page', () => {
    test.beforeAll(async ({ browser }) => {
        await loadSession(browser);
        await page.goto(process.env.APP_URL!)
    })

    test('should show the profile page', async ({ browser }) => {
        await expect(page.getByText("nope")).toBeVisible();
    })
})

