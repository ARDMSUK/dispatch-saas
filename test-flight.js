const API_KEY = 'f6371aefe0583d7c13cc8f9e8bf1d2bd';
const flightNumber = 'BA123';
fetch(`http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&flight_iata=${flightNumber}&limit=1`)
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
