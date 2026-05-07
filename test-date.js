const now = new Date("2026-05-06T16:19:00.000Z"); // 16:19 UTC = 17:19 BST
console.log("Original now (UTC):", now.toISOString());
console.log("Local string:", now.toString());
const offset = -60; // BST
const adjusted = new Date(now.getTime() - offset * 60000);
console.log("Adjusted (UTC):", adjusted.toISOString());
const sliced = adjusted.toISOString().slice(0, 16);
console.log("Sliced for input:", sliced);

const submittedDate = new Date(sliced);
console.log("Submitted Date (interpreted locally):", submittedDate.toISOString());
