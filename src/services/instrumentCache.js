// src/services/instrumentCache.js

let instruments = null;
let lastLoaded = null;

export function setInstruments(data) {
  instruments = data;
  lastLoaded = new Date();
}

export function getInstruments() {
  return instruments;
}

export function hasInstruments() {
  return Array.isArray(instruments) && instruments.length > 0;
}

export function getInstrumentCount() {
  return instruments ? instruments.length : 0;
}

export function getLastLoaded() {
  return lastLoaded;
}

export function clearInstruments() {
  instruments = null;
  lastLoaded = null;
}