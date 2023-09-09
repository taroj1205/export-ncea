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
        try {
            const headers = document.querySelectorAll("h4");
            let header;

            headers.forEach(function (h) {
                if (h.textContent.includes("Stored Results - Detailed")) {
                    header = h;
                }
            });

            const table = header.nextElementSibling;
            const rows = table.querySelectorAll("tr");
            const activeRows = table.querySelectorAll("tr.table-active");
            console.log(activeRows);
            const data = [];

            let count = 0;
            rows.forEach(function (row) {
                const columns = row.querySelectorAll("td");
                const subject = activeRows[count].textContent.trim();
                if (columns.length === 3) {
                    const name = columns[0].textContent.trim();
                    const credits = columns[1].textContent.trim();
                    const achievement = columns[2].textContent.trim();

                    // console.log(subject, name, credits, achievement);

                    if (activeRows[count + 1]) {
                        const nextSubject = activeRows[count + 1].textContent.trim();
                        if (subject !== nextSubject || subject === "Other") {
                            count++;
                        }
                    }

                    if (!name || !credits || !achievement || !subject) {
                        return;
                    }

                    if (subject === "13ESJPN") {
                        console.log(subject, name, credits, achievement);
                    }

                    data.push({
                        name,
                        credits,
                        achievement,
                        subject,
                    });
                } else {
                    if (activeRows[count + 1]) {
                        const nextSubject = activeRows[count + 1].textContent.trim();
                        if (subject !== nextSubject || subject === "Other") {
                            count++;
                        }
                    }
                }
            });

            function convertAndFormatData(data) {
                return new Promise(function (resolve, reject) {
                    const formattedData = [];
                    data.forEach(function (item) {
                        const regex = /^(.*?)\s+(\d+\.\d+)\s+-\s+(.*)$/;
                        const match = item.name.match(regex);
                        if (match) {
                            const subject = item.subject;
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
                    console.log(error);
                    reject(error);
                });
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.data) {
        console.log(message.data); // Log the data received from the content script
    }
});
