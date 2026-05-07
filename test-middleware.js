const hostname = "www.cabai.co.uk";
let currentHost = hostname;
currentHost = hostname.replace(`.cabai.co.uk`, "");
console.log("currentHost:", currentHost);
console.log("currentHost !== hostname:", currentHost !== hostname);
