import { NextSeo } from 'next-seo';


export const SEO = () => {
    const siteName = '📝 Ask Paper – Your AI Paper Assistant'
    const description = "Ask questions & Extract datasets from papers."
    const title = "📝 Ask Paper"
    const url = `https://www.askpaper.ai`

    return (
        <NextSeo
            title={title}
            description={description}
            canonical={url}
            openGraph={{
                url,
                title: title,
                description: description,
                images: [{ url: `${url}/demo.png` }, { url: `${url}/hippo.png` }],
                site_name: siteName,
            }}
        />
    )
};
