// export async function mockRequestedUrl(page, routeToMock, mock) {
//     await page.route(routeToMock, async (route) => {
//         try {
//             await route.fulfill({
//                 status: 200,
//                 contentType: 'application/json',
//                 body: JSON.stringify(mock),
//             });
//         } catch (error) {
//             console.error('Error fulfilling mock route:', error);
//             route.abort();
//         }
//     });
// }
