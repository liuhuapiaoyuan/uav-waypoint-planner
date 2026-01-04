import * as Cesium from "cesium";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// 设置 Cesium 静态资源路径（使用 CDN）
(window as any).CESIUM_BASE_URL =
  "https://cesium.com/downloads/cesiumjs/releases/1.136/Build/Cesium/";

// 禁用 Cesium Ion 默认 Token（使用天地图不需要）
Cesium.Ion.defaultAccessToken = "";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
