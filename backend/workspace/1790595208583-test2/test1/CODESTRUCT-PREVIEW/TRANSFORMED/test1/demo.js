const userName = "Ashick";
let total = 0;

document.getElementById("title").innerText = "Welcome " + userName;

fetch("https://jsonplaceholder.typicode.com/users/1")
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    document.getElementById("user").innerText = data.name;
  });

function add(a, b) {
  return a + b;
}

function login(username, password) {
  if (username === "admin" && password === "1234") {
    document.getElementById("status").innerText = "Login successful";
    fetch("https://jsonplaceholder.typicode.com/posts")
      .then(function(response) {
        return response.json();
      })
      .then(function(posts) {
        console.log(posts);
      });
  } else {
    document.getElementById("status").innerText = "Login failed";
  }
}

function calculateSalary(salary, bonus) {
  total = salary + bonus;
  document.getElementById("salary").innerText = total;
  return total;
}

document.getElementById("loginBtn").addEventListener("click", function() {
  login("admin", "1234");
});

console.log("Application started");