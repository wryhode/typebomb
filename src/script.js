// Getting document elements
const mainGameDiv = document.getElementById("mainGameBox");
const notificationBox = document.getElementById("notificationBox");
const titleDiv = document.getElementById("titleDiv");
const scoreMenu = document.getElementById("scoreMenu");
const leaderboard = document.getElementById("leaderboard");
const gameMessageDiv = document.getElementById("gameMessageDiv");
const gameMessage = document.getElementById("gameMessage");
const lettersDiv = document.getElementById("letters");
const timeoutDuration = document.getElementById("timeoutDuration");
const dyslexiaButton = document.getElementById("dyslexiaButton");
const settingsDiv = document.getElementById("settingsMenu");
const resetHighscoreButton = document.getElementById("resetHighscoreButton");
const renameButton = document.getElementById("renameButton");
const scoreCounter = document.getElementById("scoreCounter");
const highscoreCounter = document.getElementById("highscoreCounter");
const leaderboardList = document.getElementById("leaderboardList");
const gameNotifier = document.getElementById("gameNotifier");
const hasRestarted = document.getElementById("hasRestarted");

// Game variables
const charset = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']; // The characters that are allowed to appear in game
let availableCharset = charset.slice(0);    // To mitigate duplicate characters, pick items from this array and remove it. (Copies but does not link them)
let charItersWithoutRefresh = 0;            // How many character pulls have occured without resetting availableCharset
let symbols = new Array();                  // Array of Symbol objects
let activeSymbol = null;                    // Points to the active symbol
let isNotifying = false;                    // Is the notification menu active?
let isGameMessageActive = false;            // Is the game message notifier active?
let takeGameInput = false;                  // Whether or not to evaluate 
let loseTimeoutID = null                    // Last timeout ID to stop it to not gameover immediately
let score = null;                           // Self explanatory
let highScore = 0;                          // this is the LOCAL highscore
let timeOutTime = 5000;                     // Doesn't set anything, the time in ms of the gameover timeout
let dyslexiaMode = false;                   // A joke mode suggested by my dyslexic friend as a challenge
let playerName = "Guest";                   // Default player name in case they've never played before
let hasPlayed = false;                      // Has the game been started at least once?
let canRestart = true;                      // If the user can restart the game, theres a little delay when the game ends to not be confusing
let hasChosenChar = false;                  // Has the game actually started (char blinking?)

// A class to simplify symbol handling
class Symbol
{
    constructor(parentElement, symbol)
    {
        this.parentElement = parentElement;
        this.element = null
        this.symbol = symbol;

        this.createElement = function()
        {
            this.element = document.createElement("div");
            this.element.className = "letter";
            this.element.innerHTML = this.symbol;
            this.parentElement.appendChild(this.element);
        }

        this.setAnimation = function(animate)
        {
            if(animate)
            {
                this.element.classList.add("blinkingLetter");
            }
            else
            {
                this.element.classList.remove("blinkingLetter");
            }
        }
    }
}

// General key handling function
function handleKeyPress(event)
{
    const key = event.key;
    const gameKey = key.toUpperCase();
    let specials = event.ctrlKey | event.shiftKey | event.altKey; // Were there any special keys pressed? Stops re-starting the game if the user uses ctrl + r to reload etc.

    if(takeGameInput)
    {
        if(hasChosenChar && charset.includes(gameKey))
        {
            if(gameKey == activeSymbol.symbol)
            {
                setupGameChars(5);
                score ++;
            }
            else
            {
                misTyped();
            }
        }
    }
    else
    {
        if(canRestart && charset.includes(gameKey) && !specials)
        {
            startGame();
        }
    }
}

function resetCanRestart()
{
    canRestart = true;
    gameNotifier.style.visibility = "visible";
    startGameBlink();
}

// Gets called if the user mistypes or the timer runs out. Initiates gameover state and returns to the menus
function misTyped()
{
    canRestart = false;
    takeGameInput = false;
    activeSymbol.setAnimation(false);
    lettersDiv.style.visibility = "hidden";
    scoreCounter.innerHTML = score;
    highscoreCounter.innerHTML = highScore;
    if(score > highScore)
    {
        highScore = score;
        saveToLocalStorage();
        GJAPI.ScoreAddGuest(885603, score, `Score: ${score}`, playerName);
    }
    saveToLocalStorage();
    GJAPI.ScoreFetch(885603, GJAPI.SCORE_ALL, 10, updateScoreboard);
    displayGameMessage("Game over!");
    setTimeout(resetCanRestart, 1000);
    startMenu();
}

// Updates the leaderboard in the DOM with a GJAPI call
function updateScoreboard(pResponse)
{
    leaderboardList.innerHTML = "";
    if(!pResponse.scores) return;

    for(let i = 0; i < pResponse.scores.length; ++i)
    {
        const pScore = pResponse.scores[i];
        
        let el = document.createElement("li");
        el.innerHTML = (pScore.user ? pScore.user : pScore.guest) + " - " + pScore.score;

        leaderboardList.appendChild(el);
    }
}

// Resets the available charaters, this opens for duplicates so fix this later
function resetAvailableChars()
{
    availableCharset = charset.slice(0);
}

// Picks a random character from the remaining characters
function pickRandomChar()
{
    let randomIndex = Math.floor(Math.random() * availableCharset.length);
    let char = availableCharset[randomIndex];
    availableCharset.splice(randomIndex, 1);
    return char;
}

// Picks multiple, not repeating characters
function pickRandomCharMulti(nChars)
{
    let pickedChars = new Array();
    for(let i = 0; i < nChars; i ++)
    {
        pickedChars.push(pickRandomChar());
    }
    return pickedChars;
}

// Hides the notification bar thingy
function hideNotification()
{
    isNotifying = false;
    notificationBox.style.visibility = boolToDisplayStyle(isNotifying);
}

// Yup,, you guessed it
function displayNotification(title, message)
{
    notificationBox.innerHTML = "";
    let titleElement = document.createElement("h1");
    titleElement.innerHTML = title;
    let contentElement = document.createElement("p");
    contentElement.innerHTML = message;
    notificationBox.appendChild(titleElement);
    notificationBox.appendChild(contentElement);
    isNotifying = true;
    notificationBox.style.visibility = boolToDisplayStyle(isNotifying);
    notificationBox.addEventListener("animationend", hideNotification)
}

// Self explanatory
function hideGameMessage()
{
    isGameMessageActive = false;
    gameMessageDiv.style.display = "none";
}

// This too
function displayGameMessage(message, fadeTime = 5000)
{
    gameMessage.innerHTML = message;
    isGameMessageActive = true;
    gameMessageDiv.style.display = "unset";
    gameMessageDiv.addEventListener("animationend", hideGameMessage);
}

// Creates a new symbol and a symbol element
function createSymbol(symbol = "A")
{
    let symbolEl = new Symbol(lettersDiv, symbol);
    symbolEl.createElement();
    symbols.push(symbolEl);
}

// Creates many symbols
function createSymbols(nSymbols, symbols)
{
    for (let i = 0; i < nSymbols; i++)
    {
        createSymbol(symbols[i]);
    }
}

// Instead of writing "unset" or "none" for standard menu elements
function boolToDisplayStyle(show)
{
    if(show)
    {
        return "visible";
    }
    else
    {
        return "hidden";
    }
}

// Saves to localstorage
function saveToLocalStorage()
{
    localStorage.setItem("highscore", highScore);
    localStorage.setItem("username", playerName);
}

// Reads from localstorage, no verification at the moment, pls fix
function loadFromLocalStorage()
{
    highScore = localStorage.getItem("highscore");
    playerName = localStorage.getItem("username");
}

// Called once the game starts or the user types the correct key
function setupGameChars(nChars)
{
    hasChosenChar = false;
    clearTimeout(loseTimeoutID);

    if(dyslexiaMode)
    {
        lettersDiv.style.fontSize = "1rem";
        lettersDiv.style.fontFamily = "A Cursive"
        nChars = charset.length;
    }
    else
    {
        lettersDiv.style.fontSize = "10rem";
        lettersDiv.style.fontFamily = "Monospace"
    }

    symbols = new Array();
    lettersDiv.innerHTML = "";
    let charList = pickRandomCharMulti(nChars);

    createSymbols(nChars, charList);  
    
    charItersWithoutRefresh ++;
    if(charItersWithoutRefresh >= 2 - dyslexiaMode)
    {
        resetAvailableChars();
        charItersWithoutRefresh = 0;
    }
    
    timeOutTime = 5000 / ((score/10) + 1);
    setTimeout(selectRandomChar, 250 + Math.random() * 1000);
}

// Activates the joke mode
function toggleDyslexiaMode()
{
    dyslexiaMode = !dyslexiaMode;
    if(dyslexiaMode)
    {
        displayNotification("Info", "Dyslexia mode is on. (Good luck)")
    }
    else
    {
        displayNotification("Info", "Dyslexia mode is off. (Good luck)")
    }
}

// Selects a random symbol class
function selectRandomChar()
{
    let whichChar = Math.floor(Math.random() * symbols.length);
    activeSymbol = symbols[whichChar];
    
    hasChosenChar = true;
    activeSymbol.setAnimation(true);

    // Actually starts the losing timer
    loseTimeoutID = setTimeout(misTyped, timeOutTime);
}

// Gee i wonder what this does
// bool show controls if menu elements are visible or hidden
function showMenuElements(show)
{
    let displayStyle = boolToDisplayStyle(show);
    scoreMenu.style.visibility = displayStyle;
    leaderboard.style.visibility = displayStyle;
    settingsDiv.style.visibility = displayStyle;
    notificationBox.style.visibility = boolToDisplayStyle(show * isNotifying);
    gameMessageDiv.style.visibility = boolToDisplayStyle(show * isGameMessageActive);
    if(!show)
    {
        gameNotifier.style.visibility = "hidden";
    }
}

// Rename the player and store in localstorage
function rename()
{
    let input = prompt("New name");
    if(input != null)
    {
        playerName = input;
        saveToLocalStorage();
        displayNotification("Info", `Changed name to: ${playerName}`);
    }
}

// Starts the "attract mode" blinking thingamabob 
function startGameBlink()
{
    gameNotifier.classList.add("blinking");
}

// Stops the attract mode
function stopGameBlink()
{
    gameNotifier.classList.remove("blinking");
}

function updateAfterPlayed()
{
    hasRestarted.innerHTML = "re";
}

// TW: Resetting values of a certain high score
// You guys won't believe what im doing rn
// ...
function resetHighscore()
{
    highScore = 0;
    highscoreCounter.innerHTML = highScore;
    saveToLocalStorage();
    displayNotification("Info", "Reset the local high score");
}

// Shows menu
function startMenu()
{
    if(score != null)
    {
        scoreCounter.innerHTML = score;
    }
    else
    {
        scoreCounter.innerHTML = "no"
    }
    takeGameInput = false;
    showMenuElements(true);
    //displayNotification("Tips", "You can restart immediately after a game over by pressing a key");
}

// Can you believe it guys?? startGame() function in a game??? Woohoo! I am so happy about this information
function startGame()
{
    score = 0;
    stopGameBlink();
    setupGameChars(5);
    showMenuElements(false);
    updateAfterPlayed()
    hideGameMessage();
    lettersDiv.style.visibility = "visible";
    hasPlayed = true;
    takeGameInput = true;
}

// Called after the title fade
function init()
{
    GJAPI.ScoreFetch(885603, GJAPI.SCORE_ALL, 10, updateScoreboard);
    titleDiv.style.visibility = "hidden";
    scoreCounter.innerHTML = score;
    highscoreCounter.innerHTML = highScore;
    gameNotifier.style.visibility = "visible";
    startMenu();
}

// Pre-init-init-initialisation-start-code
loadFromLocalStorage();
document.addEventListener("keydown", handleKeyPress);
dyslexiaButton.onclick = toggleDyslexiaMode;
renameButton.onclick = rename;
resetHighscoreButton.onclick = resetHighscore;
showMenuElements(false);
gameNotifier.style.visibility = "hidden";
titleDiv.style.visibility = "visible";
titleDiv.onanimationend = init;

// Name the tab if hosted locally to differentiate in developement
if(window.location.href.startsWith("file://"))
{
    document.title = "typebomb (local)";
}

titleDiv.focus(); // An attempt at mobile support, should open the virtual keyboard