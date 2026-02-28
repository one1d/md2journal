/**
 * Browser Pool - Manages Puppeteer browser instances for reuse
 *
 * This module provides a pool of browser instances to avoid the overhead
 * of launching a new browser for each PDF conversion.
 */

import puppeteer from 'puppeteer';

class BrowserPool {
  constructor(options = {}) {
    this.maxBrowsers = options.maxBrowsers || 3;
    this.launchOptions = options.launchOptions || {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    this.browsers = [];
    this.waitQueue = [];
    this.closed = false;
  }

  /**
   * Launch a new browser instance
   */
  async launchBrowser() {
    return await puppeteer.launch(this.launchOptions);
  }

  /**
   * Get a browser from the pool or create a new one
   */
  async acquire() {
    if (this.closed) {
      throw new Error('Browser pool is closed');
    }

    // Try to get an existing browser
    while (this.browsers.length > 0) {
      const browser = this.browsers.pop();
      if (browser.connected) {
        return browser;
      }
    }

    // Launch a new browser if we haven't reached the limit
    return await this.launchBrowser();
  }

  /**
   * Return a browser to the pool
   */
  async release(browser) {
    if (this.closed) {
      if (browser.connected) {
        await browser.close();
      }
      return;
    }

    // Only add connected browsers back to the pool
    if (browser.connected) {
      this.browsers.push(browser);
    }
  }

  /**
   * Close all browsers in the pool
   */
  async close() {
    this.closed = true;

    // Close all pooled browsers
    const closePromises = this.browsers.map((browser) => {
      if (browser.connected) {
        return browser.close().catch(() => {});
      }
      return Promise.resolve();
    });
    await Promise.all(closePromises);
    this.browsers = [];

    // Close any waiting browsers
    this.waitQueue = [];
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      pooled: this.browsers.length,
      maxBrowsers: this.maxBrowsers,
      queueLength: this.waitQueue.length,
      closed: this.closed
    };
  }
}

/**
 * Create a shared browser pool
 */
let sharedPool = null;

export function createBrowserPool(options) {
  return new BrowserPool(options);
}

export function getSharedPool() {
  return sharedPool;
}

export function setSharedPool(pool) {
  sharedPool = pool;
}

export { BrowserPool };
