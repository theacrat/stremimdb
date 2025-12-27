import { type UserSettings } from "./userSettings";
import { html } from "hono/html";

export function renderHomePage(defaultSettings: UserSettings) {
	return html`
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>StremIMDb - Configure Addon</title>
				<style>
					* {
						box-sizing: border-box;
						margin: 0;
						padding: 0;
					}
					body {
						font-family:
							-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
							Ubuntu, Cantarell, sans-serif;
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						min-height: 100vh;
						display: flex;
						justify-content: center;
						align-items: center;
						padding: 20px;
					}
					.container {
						background: white;
						border-radius: 12px;
						box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
						padding: 40px;
						max-width: 600px;
						width: 100%;
					}
					.header {
						text-align: center;
						margin-bottom: 30px;
					}
					.header img {
						width: 200px;
						margin-bottom: 20px;
					}
					h1 {
						color: #333;
						font-size: 28px;
						margin-bottom: 10px;
					}
					.subtitle {
						color: #666;
						font-size: 16px;
					}
					.form-group {
						margin-bottom: 25px;
					}
					label {
						display: block;
						color: #333;
						font-weight: 600;
						margin-bottom: 8px;
						font-size: 14px;
					}
					input[type="text"],
					select {
						width: 100%;
						padding: 12px;
						border: 2px solid #e0e0e0;
						border-radius: 6px;
						font-size: 14px;
						transition: border-color 0.3s;
					}
					input[type="text"]:focus,
					select:focus {
						outline: none;
						border-color: #667eea;
					}
					.checkbox-group {
						display: flex;
						align-items: center;
						gap: 10px;
					}
					input[type="checkbox"] {
						width: 20px;
						height: 20px;
						cursor: pointer;
					}
					.checkbox-group label {
						margin: 0;
						cursor: pointer;
					}
					.button {
						width: 100%;
						padding: 14px;
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						color: white;
						border: none;
						border-radius: 6px;
						font-size: 16px;
						font-weight: 600;
						cursor: pointer;
						transition:
							transform 0.2s,
							box-shadow 0.2s;
					}
					.button:hover {
						transform: translateY(-2px);
						box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
					}
					.button:active {
						transform: translateY(0);
					}
					.result {
						margin-top: 25px;
						padding: 20px;
						background: #f5f5f5;
						border-radius: 6px;
						display: none;
					}
					.result.show {
						display: block;
					}
					.result h3 {
						color: #333;
						font-size: 16px;
						margin-bottom: 12px;
					}
					.url-display {
						background: white;
						padding: 12px;
						border-radius: 4px;
						border: 2px solid #e0e0e0;
						word-break: break-all;
						font-family: "Courier New", monospace;
						font-size: 13px;
						color: #667eea;
						margin-bottom: 12px;
					}
					.copy-button {
						padding: 10px 20px;
						background: #667eea;
						color: white;
						border: none;
						border-radius: 4px;
						cursor: pointer;
						font-size: 14px;
						font-weight: 600;
						margin-right: 10px;
					}
					.copy-button:hover {
						background: #5568d3;
					}
					.install-button {
						padding: 10px 20px;
						background: #28a745;
						color: white;
						border: none;
						border-radius: 4px;
						cursor: pointer;
						font-size: 14px;
						font-weight: 600;
						text-decoration: none;
						display: inline-block;
					}
					.install-button:hover {
						background: #218838;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<img
							src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IMDB_Logo_2016.svg/575px-IMDB_Logo_2016.svg.png"
							alt="IMDb Logo"
						/>
						<h1>StremIMDb Addon</h1>
						<p class="subtitle">Configure your IMDb metadata preferences</p>
					</div>

					<form id="settingsForm">
						<div class="form-group">
							<label for="languageCode">Language Code</label>
							<input
								type="text"
								id="languageCode"
								name="languageCode"
								value="${defaultSettings.languageCode}"
								placeholder="e.g., en-US, es-ES, fr-FR"
							/>
						</div>

						<div class="form-group">
							<div class="checkbox-group">
								<input
									type="checkbox"
									id="hideLowQuality"
									name="hideLowQuality"
									${defaultSettings.hideLowQuality ? "checked" : ""}
								/>
								<label for="hideLowQuality">Hide low quality content</label>
							</div>
						</div>

						<button type="submit" class="button">Generate Manifest URL</button>
					</form>

					<div class="result" id="result">
						<h3>Your Manifest URL:</h3>
						<div class="url-display" id="manifestUrl"></div>
						<button
							type="button"
							class="copy-button"
							onclick="copyToClipboard()"
						>
							Copy URL
						</button>
						<a id="installLink" class="install-button" target="_blank"
							>Install in Stremio</a
						>
					</div>
				</div>

				<script>
					document
						.getElementById("settingsForm")
						.addEventListener("submit", function (e) {
							e.preventDefault();

							const languageCode =
								document.getElementById("languageCode").value;
							const hideLowQuality =
								document.getElementById("hideLowQuality").checked;

							const settings = {
								languageCode: languageCode,
								hideLowQuality: hideLowQuality,
							};

							// Encode settings (matching the server-side encoding logic)
							const encoded = {
								l: settings.languageCode,
								h: settings.hideLowQuality,
							};
							const json = JSON.stringify(encoded);
							const base64 = btoa(json);

							const baseUrl =
								window.location.protocol + "//" + window.location.host;
							const manifestUrl = baseUrl + "/" + base64 + "/manifest.json";

							document.getElementById("manifestUrl").textContent = manifestUrl;
							document.getElementById("installLink").href =
								"stremio://" + manifestUrl.replace(/^https?:\\/\\//, "");
							document.getElementById("result").classList.add("show");
						});

					function copyToClipboard() {
						const url = document.getElementById("manifestUrl").textContent;
						navigator.clipboard.writeText(url).then(function () {
							const button = document.querySelector(".copy-button");
							const originalText = button.textContent;
							button.textContent = "Copied!";
							setTimeout(function () {
								button.textContent = originalText;
							}, 2000);
						});
					}
				</script>
			</body>
		</html>
	`;
}
