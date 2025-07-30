const data = [
  {
    image: "BLACK_HAIR.png",
    title: "Luci casual 1",
    desc: "A casual street style with a modern twist.",
  },
  {
    image: "BLACK_HAIR_BUNBAT.png",
    title: "luci casual 2",
    desc: "no jacket, just a simple t-shirt and jeans.",
  },
   {
    image: "BLACK_HAIR_NOJACKET.png",
    title: "luci casual 3",
    desc: "no jacket, just a simple t-shirt and jeans.",
  },
   {
    image: "BLACK_HAIR_BUNBAT_NOJACKET.png",
    title: "luci casual 4",
    desc: "no jacket, just a simple t-shirt and jeans.",
  }

];

let index = 0;

function updateCard() {
  document.getElementById("characterImage").src = data[index].image;
  document.getElementById("characterTitle").innerText = data[index].title;
  document.getElementById("characterDesc").innerText = data[index].desc;
}

function nextImage() {
  index = (index + 1) % data.length;
  updateCard();
}

function prevImage() {
  index = (index - 1 + data.length) % data.length;
  updateCard();
}

window.onload = updateCard;
