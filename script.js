// Initialize Firebase
var tbffirebase = {
  apiKey: "AIzaSyAmw_LYg61dZ_WRRO73sKwQgNLxquqpUNc",
  authDomain: "travel-buddy-finder-2d06e.firebaseapp.com",
  databaseURL: "https://travel-buddy-finder-2d06e-default-rtdb.firebaseio.com",
  projectId: "travel-buddy-finder-2d06e",
  storageBucket: "travel-buddy-finder-2d06e.appspot.com",
  messagingSenderId: "951098257369",
  appId: "1:951098257369:web:fd1dbe8baa0f79876d73c8",
  measurementId: "G-E13V3MZ4HB"
};

firebase.initializeApp(tbffirebase);
const database = firebase.database();

// Basic Functions starts !

function changetogreen() {
  const label = document.querySelector(".profilePicture");
  label.style.background = "lightgreen";
}

function showaccountdetails() {
  var accountsection = document.querySelector('.account-section');
  accountsection.style.display = "block";
}

function hideaccountdetails() {
  var accountsection = document.querySelector('.account-section');
  accountsection.style.display = "none";
}

function startbasicfunctions() {
  const greetuser = document.getElementById('greetuser');

  var nameofuserdisplay = localStorage.getItem("nameofuser");
  greetuser.innerText = " Hello , " + nameofuserdisplay + " 🤗 " + "Welcome Back ! " + " ❤️";

}



// Personality Test Dialog Box Toggle Code Starts Here !

var popupofpersonalitytestbox = document.querySelector(".popupofpersonalitytest");
function showpersonalitytestdialogbox() {
  popupofpersonalitytestbox.style.display = "block";
}
function hidepersonalitytest() {
  popupofpersonalitytestbox.style.display = "none";
}

// Personality Test Dialog Box Toggle Code Ends  Here  !










function getUserIDFromDatabase() {
  // Retrieve user info from local storage
  const name = localStorage.getItem('nameofuser');
  const phoneno = localStorage.getItem('phonenoofuser');
  const age = localStorage.getItem('ageofuser');
  const vegnonveg = localStorage.getItem('userfoodtaste');

  // Create a reference to the Firebase database
  const usersRef = database.ref('users');

  // Retrieve all users from Firebase
  usersRef.once('value', function (snapshot) {
    snapshot.forEach(function (childSnapshot) {
      const user = childSnapshot.val();

      // Check if the retrieved user matches the local storage info
      if (
        user.name === name &&
        user.phoneno === phoneno &&
        user.age === age &&
        user.vegnonveg === vegnonveg
      ) {
        // Save the user's randomly generated ID in local storage
        const userID = childSnapshot.key;
        localStorage.setItem("UID", userID);
      }
    });
  });
}












// Personality Test Saving Into User's ID Logic Starts Here !

function savepersonalitytest() {
  // Retrieve personality test input
  const personality = document.getElementById('personalitytestinputfield').value;

  // Retrieve user info from local storage
  const name = localStorage.getItem('nameofuser');
  const phoneno = localStorage.getItem('phonenoofuser');
  const age = localStorage.getItem('ageofuser');
  const vegnonveg = localStorage.getItem('userfoodtaste');

  // Create a reference to the Firebase database
  const usersRef = database.ref('users');

  // Retrieve all users from Firebase
  usersRef.once('value', function (snapshot) {
      snapshot.forEach(function (childSnapshot) {
          const user = childSnapshot.val();

          // Check if the retrieved user matches the local storage info
          if (
              user.name === name &&
              user.phoneno === phoneno &&
              user.age === age &&
              user.vegnonveg === vegnonveg
          ) {
              // Update the user's personality information
              usersRef.child(childSnapshot.key).update({
                  personality: personality,
              });

              // Update local storage
              localStorage.setItem('personalityofuser', personality);
              alert("Your Personality Saved Successfuly In Your Account ☢️ . Kindly Reload To See The Changes In Your Account In Account Section 😊")
              window.location.href = "index.html";
          }
      });
  });
}


// Personality Test Saving Into User's ID Logic Ends Here   !



function saveUserInfo() {
  const profilePicture = document.getElementById('profilePicture').files[0];
  const name = document.getElementById('name').value;
  const phoneno = document.getElementById('phone_number').value;
  const age = document.getElementById('age').value;
  const vegnonveg = document.getElementById('vegnonveg').value;

  // Convert the profile picture to Base64 URL format
  const reader = new FileReader();
  reader.onload = function () {


      const profilePictureBase64 = reader.result;

      // Create a new user object
      const user = {
          profilePictureBase64,
          name,
          phoneno,
          age,
          vegnonveg
      };

      database.ref('users').push(user);
      alert("Your Profile Saved Successfuly In Our System In Such A Powerfull Encryption 🔒 , Now Just Click On Homepage Button To Go To DashBoard 🌏")


      console.log(profilePictureBase64);
      localStorage.setItem("profilepic", profilePictureBase64);
      localStorage.setItem("nameofuser", name);
      localStorage.setItem("phonenoofuser", phoneno);
      localStorage.setItem("ageofuser", age);
      localStorage.setItem("userfoodtaste", vegnonveg);

  };

  reader.readAsDataURL(profilePicture);

}



var profilepicture = document.getElementById("profilepicture");
var nameshowing = document.getElementById("nameshowing");
var phonenoshowing = document.getElementById("phonenoshowing");
var personalityshowing = document.getElementById("personalityshowing");
var ageshowing = document.getElementById("ageshowing");
var vegnonvegshowing = document.getElementById("vegnonvegshowing");



var profilepicdisplay = localStorage.getItem("profilepic");
var nameofuserdisplay = localStorage.getItem("nameofuser");
var phonenoofuserdisplay = localStorage.getItem("phonenoofuser");
var personalityofuserdisplay = localStorage.getItem("personalityofuser")
var ageofuserdisplay = localStorage.getItem("ageofuser");
var userfoodtastedisplay = localStorage.getItem("userfoodtaste");


profilepicture.src = profilepicdisplay;
nameshowing.innerText = nameofuserdisplay;
phonenoshowing.innerText = "Phone no : " + phonenoofuserdisplay;
personalityshowing.innerText = "Personality : " + personalityofuserdisplay;
ageshowing.innerText = "Age : " + ageofuserdisplay + " Years";
vegnonvegshowing.innerText = userfoodtastedisplay;