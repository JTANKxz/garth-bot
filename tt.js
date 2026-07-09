import shan from "shan-server";

const { ShAnTikdl } = shan;

const author = "♡︎ 𝗦𝗵𝗔𝗻 ♡︎";
const url = "https://www.tiktok.com/@owilliandeoliveira/video/7659516707412790546";

try {
    const res = await ShAnTikdl(url, author);

    console.log(res);
} catch (err) {
    console.error(err);
}