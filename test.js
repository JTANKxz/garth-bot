import puppeteer from 'puppeteer';

async function searchImages(query, limit = 5) {
  const browser = await puppeteer.launch({
    headless: true
  });

  try {
    const page = await browser.newPage();

    await page.goto(
      `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`,
      {
        waitUntil: 'networkidle2',
        timeout: 30000
      }
    );

    await page.waitForSelector('.mimg', {
      timeout: 10000
    });

    const images = await page.evaluate((limit) => {
      return [...document.querySelectorAll('.mimg')]
        .map(img => ({
          url: img.src,
          alt: img.alt
        }))
        .filter(img => img.url?.startsWith('http'))
        .slice(0, limit);
    }, limit);

    return images;
  } finally {
    await browser.close();
  }
}

const result = await searchImages('naruto wallpaper', 10);

console.log('Total:', result.length);
console.log(result);