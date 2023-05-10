import { NextSeo } from 'next-seo';


export const SEO = () => {
    const siteName = '📝 Ask Paper – Your AI Paper Assistant'
    const description = "Leverage AI to understand and organize papers."
    const title = "Ask Paper 📝 – Your AI Paper Assistant"
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
