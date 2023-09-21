document.addEventListener("DOMContentLoaded", function () {
    const convertButton = document.getElementById("convertButton");
    const outputDiv = document.getElementById("output");

    convertButton.addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
            const activeTab = tabs[0];
            const url = activeTab.url;

            if (url === "https://portal.westlake.school.nz/ncea_summary") {
                chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    function: convertTable,
                }, function (result) {
                    if (chrome.runtime.lastError) {
                        outputDiv.textContent = "An error occurred while executing the script.";
                    } else {
                        const convertedData = result[0].result;
                        if (convertedData) {
                            // Copy the formatted data to the clipboard
                            const clipboardText = JSON.stringify(convertedData, null, 2);
                            navigator.clipboard.writeText(clipboardText)
                                .then(function () {
                                    outputDiv.textContent = "Table data copied to clipboard.";
                                    console.log(clipboardText);
                                })
                                .catch(function (error) {
                                    outputDiv.textContent = "Error copying data to clipboard: " + error.message;
                                });
                        } else {
                            outputDiv.textContent = "No data found on the page.";
                        }
                    }
                });
            } else {
                outputDiv.textContent = "This extension only works on 'https://portal.westlake.school.nz/ncea_summary'.";
            }
        });
    });
});

function convertTable() {
    return new Promise(function (resolve, reject) {
        // Write code here to locate and convert the specific table on the page
        // Example code for finding and formatting the table:
        const headers = document.querySelectorAll("h4");
        let header;

        headers.forEach(function (h) {
            if (h.textContent.includes("Stored Results - Detailed")) {
                header = h;
            }
        });

        const table = header.nextElementSibling;
        const rows = table.querySelectorAll("tr");
        const data = [];
        try {
            rows.forEach(function (row) {
                let name;
                const columns = row.querySelectorAll("td");
                if (columns.length === 3) {
                    name = columns[0].textContent.trim();
                    const credits = columns[1].textContent.trim();
                    const achievement = columns[2].textContent.trim();

                    let subject = '';

                    let prevElement = row.previousElementSibling;
                    while (prevElement) {
                        if (prevElement.classList.contains("table-active")) {
                            subject = prevElement.textContent.trim();
                            if (subject.includes('MAC')) {
                                name = name.replace('Mathematics and Statistics', 'Calculus');
                                console.log(name)

                            } else if (subject.includes('MAS')) {
                                name = name.replace('Mathematics and Statistics', 'Statistics');
                                console.log(name)

                            }

                            break;
                        }
                        prevElement = prevElement.previousElementSibling;
                    }

                    data.push({
                        name,
                        credits,
                        achievement,
                    });
                }
            });
        } catch (error) {
            console.log(error)
        }

        function convertAndFormatData(data) {
            return new Promise(function (resolve, reject) {
                const formattedData = [];
                data.forEach(function (item) {
                    const regex = /^(.*?)\s+(\d+\.\d+)\s+-\s+(.*)$/;
                    const match = item.name.match(regex);
                    if (match) {
                        const subject = match[1];
                        const standardNumber = match[2];
                        const name = match[3];
                        const credits = item.credits.replace(" credits", "").trim();
                        const achievement = item.achievement.replace("Achieved With ", "").trim();

                        formattedData.push({
                            name,
                            credits,
                            subject,
                            achievement,
                            standardNumber,
                        });
                    }
                });
                resolve(formattedData);
            });
        }

        convertAndFormatData(data)
            .then(function (formattedData) {
                resolve(formattedData);
            })
            .catch(function (error) {
                reject(error);
            });
    });
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.data) {
        console.log(message.data); // Log the data received from the content script
    }
});