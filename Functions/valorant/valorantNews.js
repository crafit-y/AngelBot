const axios = require("axios");
const cheerio = require("cheerio");

async function getLatestNews() {
  //   const url = "https://playvalorant.com/fr-fr/news/";
  //   const response = await axios.get(url);
  //   const $ = cheerio.load(response.data);
  //   const articles = [];

  //   // Analyzing the structure of the page to find the correct selectors
  //   $(".NewsCard-module--root--1jxvP").each((index, element) => {
  //     const title = $(element)
  //       .find(".Heading-module--heading--F0oxm")
  //       .text()
  //       .trim();
  //     const link = $(element).find("a").attr("href");
  //     const summary = $(element).find(".Copy-module--copy--S_I8k").text().trim();
  //     const image = $(element).find("img").attr("src");

  //     if (title && link && summary && image) {
  //       articles.push({
  //         title,
  //         link: `https://playvalorant.com${link}`,
  //         summary,
  //         image: image.startsWith("https")
  //           ? image
  //           : `https://playvalorant.com${image}`,
  //       });
  //     }
  //   });

  //   return articles;

  const url = "https://playvalorant.com/fr-fr/news/";

  axios
    .get(url)
    .then((response) => {
      const html = response.data;
      const $ = cheerio.load(html);

      // Sélectionner le premier article
      const firstArticle = $(".NewsArchive-content").first();

      // Récupérer l'image
      const image = firstArticle.find("img").attr("src");

      // Récupérer le titre
      const title = firstArticle.find("h3").text();

      // Récupérer la date de publication
      const date = firstArticle.find(".Date").text();

      console.log("Image URL:", image);
      console.log("Title:", title);
      console.log("Date:", date);
    })
    .catch((error) => {
      console.error("Error fetching the webpage:", error);
    });
}

module.exports = { getLatestNews };
