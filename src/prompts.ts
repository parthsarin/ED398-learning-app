const POSITIVE_REWARDS = [
    "Great choice!",
    "That sounds like a lot of fun!",
    "This one’s sure to help!",
    "Ooh, that’s a good one!",
    "I like that!",
    "Wonderful!",
];

const NEGATIVE_REWARDS = [
    "Hm okay",
    "If you say so",
    "I’m not so sure about this one",
    "I guess we can do that",
    "I hope this helps…",
    "This one’s alright too",
    "Fine.",
    "Sure.",
    "Whatever.",
    "If it’ll make you happy. >:|",
];

const SE_START = [
    "How do these tie into each other?",
    "I’m having trouble understanding how this works with what we know. Can you help me?",
    "Hm, I’m not sure how these parts fit together. How do you think they work together?",
];

const SE_MIDDLE = [
    "That makes sense. What about this next bit?",
    "Good explanation! Can you help with the next part too?",
    "So that’s what you think? What do you think about this next part?",
    "That’s starting to make sense. How does this next one fit in though?",
];

const SE_END = [
    "Oh, I see. So that’s how those go together.",
    "Ohhh, wow! That makes so much sense. Thank you for explaining!",
    "I see how that connects now. Thanks!",
];

const pickRandomFrom = (source: any[]) => () => source[Math.floor(Math.random() * source.length)];

const positivePrompt = pickRandomFrom(POSITIVE_REWARDS);
const negativePrompt = pickRandomFrom(NEGATIVE_REWARDS);
const seStartPrompt = pickRandomFrom(SE_START);
const seMiddlePrompt = pickRandomFrom(SE_MIDDLE);
const seEndPrompt = pickRandomFrom(SE_END)

export {
    positivePrompt,
    negativePrompt,
    seStartPrompt,
    seMiddlePrompt,
    seEndPrompt,
}