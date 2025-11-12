import dotenv from "dotenv";
import fs from "fs";
import puppeteer from "puppeteer";

dotenv.config();

async function clickOnLink(page, selector) {
  await page.waitForSelector(selector, { visible: true });
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if(el) el.scrollIntoView({behavior: "smooth"});
  }, selector);
  const el = await page.$(selector);
  if(el) await el.click({delay: 100})
}

async function getProducts(page) {
  await page.waitForSelector(".products .product");
  return await page.evaluate(() => {
    const data = [];
    const productsList = document.querySelectorAll(".products .product");
    productsList.forEach((product) => {
      const productImageSelector = product.querySelector(
        ".woocommerce-loop-product__link img"
      );
      const productTitleSelector = product.querySelector(
        ".woocommerce-loop-product__link .woocommerce-loop-product__title"
      );
      const productPrice = product.querySelector(
        ".woocommerce-loop-product__link .price .amount bdi"
      );

      const image = productImageSelector?.src;
      const title = productTitleSelector?.textContent;
      const price = productPrice?.textContent;

      data.push({
        image,
        title,
        price,
      });
    });
    return data;
  });
}

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: false,
  });
  const page = await browser.newPage();

  try {
    await page.goto(process.env.FURNITURE_SHOP_WEBSITE, {
      waitUntil: "networkidle0",
    });

    const link = "a[data-title='Products']";
    await clickOnLink(page, link);

    const hasNextBtn = true;
    const allProducts = [];
    while (hasNextBtn) {
      const products = await getProducts(page);
      allProducts.push(...products);

      const nextBtn = await page.$("ul.page-numbers li a.next");

      if (!nextBtn) break;

      await page.evaluate((btn) => {
        btn.scrollIntoView();
      }, nextBtn);

      await Promise.all([
        nextBtn.click(),
        page.waitForSelector(".products .product", { visible: true }),
      ]);
    }

    fs.writeFileSync(
      "./json/furniture-shop-data.json",
      JSON.stringify(allProducts, null, 2),
      "utf-8"
    );
    console.log(allProducts.length);
  } catch (error) {
    console.log("Automation error:", error);
  } finally {
    // await new Promise((resolve) => setTimeout(resolve, 2000));
    await browser.close();
  }
}

await run();
