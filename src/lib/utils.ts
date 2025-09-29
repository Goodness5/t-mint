import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const funnyTexts = {
  welcome: [
    "Welcome to the STRK treasure hunt! 🏴‍☠️",
    "Ready to claim your digital gold? ✨",
    "Your tokens are waiting... but first, let's connect! 🔗",
    "Time to make it rain STRK! ☔",
    "Don't worry, we're not asking for your firstborn... just your wallet! 👶"
  ],
  connecting: [
    "Connecting to the blockchain matrix... 🤖",
    "Summoning your wallet from the digital realm... 🔮",
    "Establishing secure connection... please don't blink! 👁️",
    "Loading your financial future... ⏳",
    "Connecting to the money dimension... 💰"
  ],
  claimSuccess: [
    "Boom! Tokens claimed successfully! 🎉",
    "You just became a STRK millionaire! 💎",
    "Mission accomplished! Your tokens are on their way! 🚀",
    "That was smooth! Like butter on a blockchain! 🧈",
    "Congratulations! You've officially joined the STRK club! 🎊"
  ],
  claimError: [
    "Oops! Something went wrong in the matrix... 🤖",
    "The blockchain gods are not pleased... 🙏",
    "Looks like we hit a digital pothole... 🕳️",
    "Error 404: Tokens not found in this dimension... 🌌",
    "The claim code seems to be on vacation... 🏖️"
  ],
  adminWelcome: [
    "Welcome to the admin control room! 🎛️",
    "Time to create some magic claim codes! ✨",
    "You hold the power to distribute STRK! ⚡",
    "Admin mode activated! Ready to mint some happiness? 😊",
    "Welcome to the token distribution headquarters! 🏢"
  ]
};

export function getRandomFunnyText(category: keyof typeof funnyTexts): string {
  const texts = funnyTexts[category];
  return texts[Math.floor(Math.random() * texts.length)];
}
