// variable to hold connection to database
let db;

// connect to the database and set it's version
const request = indexedDB.open("budgetDB", 1);

// update database if version changes
request.onupgradeneeded = function (event) {
  console.log("Upgrade needed in IndexDB");

  const { oldVersion } = event;
  const newVersion = event.newVersion || db.version;

  console.log(`DB updated from version ${oldVersion} to ${newVersion}`);

  // save a reference to the database
  db = event.target.result;

  // if the object store is empty
  if (db.objectStoreNames.length === 0) {
    // create an object store and set it to have an auto incrementing primary key
    db.createObjectStore("BudgetStore", { autoIncrement: true });
  }
};

request.onerror = function (event) {
  console.log(`Error: ${event.target.errorCode}`);
};

// when the request is successful
request.onsuccess = function (event) {
  console.log("Success");
  db = event.target.result;

  // Check if app is online before reading from db
  if (navigator.onLine) {
    console.log("Backend online!");
    syncDatabase();
  }
};

// Executes when attempting to submit a new transaction but there is no internet connection
function saveRecord(record) {
  console.log("Save record invoked");

  // Create a transaction on the BudgetStore db with readwrite access
  const transaction = db.transaction(["BudgetStore"], "readwrite");

  // Access your BudgetStore object store
  const store = transaction.objectStore("BudgetStore");

  // Add record to your store with add method
  store.add(record);
}

// Executes when the internet connection is back online
function syncDatabase() {
  console.log("check db invoked");

  //Open a transaction on the BudgetStore db
  let transaction = db.transaction(["BudgetStore"], "readwrite");

  // access your BudgetStore object
  const store = transaction.objectStore("BudgetStore");

  // get all records from store and set to a variable
  const getAll = store.getAll();

  // If the request was successful
  getAll.onsuccess = function () {
    // If there are items in the store, we need to bulk add them when we are back online
    if (getAll.result.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain. */*",
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((res) => {
          // If our returned response is not empty
          if (res.length !== 0) {
            // Open another transaction to BudgetStore with readwrite access
            transaction = db.transaction(["BudgetStore"], "readwrite");

            // Assign the current store to a variable
            const currentStore = transaction.objectStore("BudgetStore");

            // Clear existing entries because our bulk add was successful
            currentStore.clear();
            console.log("Clearing Store");
          }
        });
    }
  };
}

// Listen for app coming back online
window.addEventListener("online", syncDatabase);
