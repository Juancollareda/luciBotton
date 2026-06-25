const data = [
  {
    image: "BLACK_HAIR.png",
    title: "LUCI CASUAL 1",
    desc: "A casual street style with a modern twist.",
    attributes: { reflexes: 85, clicks: 92, tech: 78, style: 95 },
    dossier: { height: "165 cm", class: "Gold", threat: "Low" }
  },
  {
    image: "BLACK_HAIR_BUNBAT.png",
    title: "LUCI CASUAL 2",
    desc: "Streetwear coupled with the custom Bunbat hoodie.",
    attributes: { reflexes: 90, clicks: 95, tech: 80, style: 98 },
    dossier: { height: "165 cm", class: "Legendary", threat: "Medium" }
  },
  {
    image: "BLACK_HAIR_NOJACKET.png",
    title: "LUCI CASUAL 3",
    desc: "Lightweight, high-mobility streetwear variant.",
    attributes: { reflexes: 88, clicks: 89, tech: 75, style: 90 },
    dossier: { height: "165 cm", class: "Silver", threat: "Low" }
  },
  {
    image: "BLACK_HAIR_BUNBAT_NOJACKET.png",
    title: "LUCI CASUAL 4",
    desc: "Minimalist street-ready casual wear.",
    attributes: { reflexes: 87, clicks: 91, tech: 76, style: 92 },
    dossier: { height: "165 cm", class: "Gold", threat: "Low" }
  }
];

let index = 0;

function updateCard() {
  const current = data[index];
  
  // Transition image out and in for extra coolness
  const imgEl = document.getElementById("characterImage");
  imgEl.style.transform = "scale(0.96)";
  imgEl.style.opacity = "0.5";
  
  setTimeout(() => {
    imgEl.src = current.image;
    imgEl.style.transform = "scale(1.02)";
    imgEl.style.opacity = "1";
  }, 120);
  
  document.getElementById("characterTitle").innerText = current.title;
  document.getElementById("characterDesc").innerText = current.desc;
  
  // Update attributes / progress bars
  document.getElementById("bar-reflexes").style.width = current.attributes.reflexes + "%";
  document.getElementById("val-reflexes").innerText = current.attributes.reflexes + "%";
  
  document.getElementById("bar-clicks").style.width = current.attributes.clicks + "%";
  document.getElementById("val-clicks").innerText = current.attributes.clicks + "%";
  
  document.getElementById("bar-tech").style.width = current.attributes.tech + "%";
  document.getElementById("val-tech").innerText = current.attributes.tech + "%";
  
  document.getElementById("bar-style").style.width = current.attributes.style + "%";
  document.getElementById("val-style").innerText = current.attributes.style + "%";
  
  // Update metadata dossier
  document.getElementById("meta-height").innerText = current.dossier.height;
  document.getElementById("meta-class").innerText = current.dossier.class;
  document.getElementById("meta-threat").innerText = current.dossier.threat;
  
  // Update active outfit tab
  const tabs = document.querySelectorAll(".outfit-tab");
  tabs.forEach((tab, i) => {
    if (i === index) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });
}

function nextImage() {
  index = (index + 1) % data.length;
  updateCard();
}

function prevImage() {
  index = (index - 1 + data.length) % data.length;
  updateCard();
}

function selectOutfit(i) {
  index = i;
  updateCard();
}

// Collapsible Credits Drawer Toggle
function toggleCredits() {
  const drawer = document.getElementById("creditsDrawer");
  drawer.classList.toggle("open");
}

// 3D Card Hover Tilt Parallax Effect
const card = document.getElementById("tilt-card");
document.addEventListener("mousemove", e => {
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2;
  const y = e.clientY - rect.top - rect.height / 2;
  
  // Calculate relative rotation angles
  const rotX = (-y / (rect.height / 2)) * 12; // tilt max 12deg
  const rotY = (x / (rect.width / 2)) * 12;
  
  // Apply rotation
  card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
});

document.addEventListener("mouseleave", () => {
  if (!card) return;
  // Reset rotation smoothly
  card.style.transform = `rotateX(0deg) rotateY(0deg)`;
  card.style.transition = "transform 0.5s ease";
});

card.addEventListener("mouseenter", () => {
  card.style.transition = "transform 0.05s ease-out";
});

window.onload = updateCard;
