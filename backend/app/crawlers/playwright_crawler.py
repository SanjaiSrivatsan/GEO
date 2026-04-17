"""
Playwright-based crawler for JavaScript-heavy websites
Used as a fallback when Scrapy returns insufficient content
"""
from playwright.async_api import async_playwright, Page, Browser
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import asyncio
import re
import random
from typing import List, Dict, Optional, Set
from loguru import logger
import httpx

# Realistic user agents for stealth
_USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
]


class PlaywrightCrawler:
    """
    Crawls websites using Playwright (Chromium browser)
    Handles JavaScript-rendered content
    """
    
    def __init__(self, start_url: str, max_pages: int = 30, max_depth: int = 2):
        """
        Initialize Playwright crawler
        
        Args:
            start_url: The website URL to crawl
            max_pages: Maximum number of pages to crawl
            max_depth: Maximum depth to crawl
        """
        self.start_url = start_url
        self.max_pages = max_pages
        self.max_depth = max_depth
        
        # Parse domain
        parsed_url = urlparse(start_url)
        self.domain = parsed_url.netloc.replace('www.', '')
        self.base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
        
        # State tracking
        self.visited_urls: Set[str] = set()
        self.pages_data: List[Dict] = []
        self.url_queue: List[tuple] = [(start_url, 0)]  # (url, depth)
    
    async def crawl(self) -> List[Dict]:
        """
        Crawl the website and return extracted data
        
        Returns:
            List of page data dictionaries
        """
        logger.info(f"Starting Playwright crawl for {self.start_url}")
        
        async with async_playwright() as p:
            ua = random.choice(_USER_AGENTS)
            browser = await p.chromium.launch(
                headless=True,
                args=['--disable-blink-features=AutomationControlled']
            )
            context = await browser.new_context(
                user_agent=ua,
                viewport={'width': 1920, 'height': 1080},
                java_script_enabled=True,
                locale='en-US',
            )
            # Remove webdriver flag so sites don't detect automation
            await context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            """)
            page = await context.new_page()
            
            try:
                while self.url_queue and len(self.pages_data) < self.max_pages:
                    current_url, depth = self.url_queue.pop(0)
                    
                    # Skip if already visited or depth exceeded
                    if current_url in self.visited_urls or depth > self.max_depth:
                        continue
                    
                    # Mark as visited
                    self.visited_urls.add(current_url)
                    
                    # Crawl page
                    page_data = await self._crawl_page(page, current_url, depth)
                    
                    if page_data:
                        self.pages_data.append(page_data)
                        
                        # Extract links for further crawling
                        if depth < self.max_depth:
                            links = await self._extract_links(page, current_url)
                            for link in links:
                                if link not in self.visited_urls:
                                    self.url_queue.append((link, depth + 1))
            
            except Exception as e:
                logger.error(f"Error during Playwright crawl: {e}")
            
            finally:
                await context.close()
                await browser.close()
        
        # If Playwright got zero pages, fallback to simple httpx fetch
        if not self.pages_data:
            logger.warning(f"Playwright got 0 pages, trying httpx fallback for {self.start_url}")
            fallback = await self._httpx_fallback(self.start_url)
            if fallback:
                self.pages_data.append(fallback)
        
        logger.info(f"Playwright crawl completed. Pages crawled: {len(self.pages_data)}")
        return self.pages_data
    
    async def _httpx_fallback(self, url: str) -> Optional[Dict]:
        """Simple httpx GET as fallback when Playwright is blocked."""
        try:
            ua = random.choice(_USER_AGENTS)
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=20.0,
                headers={'User-Agent': ua, 'Accept': 'text/html,application/xhtml+xml,*/*', 'Accept-Language': 'en-US,en;q=0.9'}
            ) as client:
                resp = await client.get(url)
                if resp.status_code >= 400:
                    logger.warning(f"httpx fallback failed for {url}: HTTP {resp.status_code}")
                    return None
                html = resp.text
                title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
                title = title_match.group(1).strip() if title_match else ''
                cleaned_text = self._extract_clean_text(html)
                nap_data = self._extract_nap_data(cleaned_text)
                soup = BeautifulSoup(html, 'html.parser')
                meta_tag = soup.find('meta', attrs={'name': 'description'})
                meta_desc = meta_tag.get('content', '') if meta_tag else ''
                h1s = [h.get_text(strip=True) for h in soup.find_all('h1') if h.get_text(strip=True)]
                h2s = [h.get_text(strip=True) for h in soup.find_all('h2') if h.get_text(strip=True)]
                logger.info(f"httpx fallback succeeded for {url}: {len(cleaned_text.split())} words")
                return {
                    'url': url,
                    'page_type': 'homepage',
                    'title': title,
                    'meta_description': meta_desc,
                    'h1_tags': h1s[:10],
                    'h2_tags': h2s[:20],
                    'raw_html': html,
                    'cleaned_text': cleaned_text,
                    'word_count': len(cleaned_text.split()),
                    **nap_data
                }
        except Exception as e:
            logger.error(f"httpx fallback failed for {url}: {e}")
            return None
    
    async def _crawl_page(self, page: Page, url: str, depth: int) -> Optional[Dict]:
        """
        Crawl a single page
        
        Args:
            page: Playwright page object
            url: URL to crawl
            depth: Current depth
            
        Returns:
            Page data dictionary or None if failed
        """
        try:
            logger.info(f"Crawling: {url} (depth: {depth})")
            
            # Navigate to page — try networkidle first, fall back to domcontentloaded
            response = None
            for wait_strategy in ['networkidle', 'domcontentloaded']:
                try:
                    response = await page.goto(url, wait_until=wait_strategy, timeout=20000)
                    break
                except Exception:
                    if wait_strategy == 'networkidle':
                        logger.debug(f"networkidle timed out for {url}, trying domcontentloaded")
                        continue
                    raise
            
            if not response or response.status >= 400:
                logger.warning(f"Failed to load {url}: Status {response.status if response else 'None'}")
                return None
            
            # Wait for content to render
            await asyncio.sleep(1.5)
            
            # Get page content
            html = await page.content()
            title = await page.title()
            
            # Extract meta description
            try:
                meta_el = page.locator('meta[name="description"]')
                meta_description = await meta_el.get_attribute('content', timeout=3000) or ''
            except Exception:
                meta_description = ''
            
            # Extract headings
            h1_elements = await page.locator('h1').all_text_contents()
            h2_elements = await page.locator('h2').all_text_contents()
            
            # Clean and extract text
            cleaned_text = self._extract_clean_text(html)
            
            # Determine page type
            is_homepage = (url == self.start_url)
            page_type = self._determine_page_type(url, title, is_homepage)
            
            # Extract NAP data
            nap_data = self._extract_nap_data(cleaned_text)
            
            # Calculate word count
            word_count = len(cleaned_text.split())
            
            # Return page data
            return {
                'url': url,
                'page_type': page_type,
                'title': title.strip(),
                'meta_description': meta_description.strip(),
                'h1_tags': [h.strip() for h in h1_elements if h.strip()],
                'h2_tags': [h.strip() for h in h2_elements if h.strip()],
                'raw_html': html,
                'cleaned_text': cleaned_text,
                'word_count': word_count,
                **nap_data
            }
        
        except Exception as e:
            logger.error(f"Error crawling {url}: {e}")
            return None
    
    async def _extract_links(self, page: Page, current_url: str) -> List[str]:
        """
        Extract links from current page
        
        Args:
            page: Playwright page object
            current_url: Current page URL
            
        Returns:
            List of valid URLs
        """
        try:
            # Get all links
            links = await page.locator('a[href]').evaluate_all(
                'elements => elements.map(e => e.href)'
            )
            
            # Filter and normalize links
            valid_links = []
            for link in links:
                # Skip external links, anchors, and non-http links
                if not link or not link.startswith('http'):
                    continue
                
                # Check if same domain
                parsed_link = urlparse(link)
                link_domain = parsed_link.netloc.replace('www.', '')
                
                if link_domain == self.domain:
                    # Remove fragment
                    clean_link = link.split('#')[0]
                    
                    # Skip if already visited
                    if clean_link and clean_link not in self.visited_urls:
                        valid_links.append(clean_link)
            
            return valid_links[:20]  # Limit to 20 links per page
        
        except Exception as e:
            logger.error(f"Error extracting links: {e}")
            return []
    
    def _extract_clean_text(self, html: str) -> str:
        """
        Extract clean text from HTML
        
        Args:
            html: Raw HTML string
            
        Returns:
            Clean text content
        """
        try:
            soup = BeautifulSoup(html, 'lxml')
            
            # Remove script and style elements
            for script in soup(['script', 'style', 'nav', 'header', 'footer', 'iframe', 'noscript']):
                script.decompose()
            
            # Get text
            text = soup.get_text(separator=' ', strip=True)
            
            # Clean whitespace
            text = re.sub(r'\s+', ' ', text)
            text = text.strip()
            
            return text
        except Exception as e:
            logger.error(f"Error extracting text: {e}")
            return ""
    
    def _determine_page_type(self, url: str, title: str, is_homepage: bool) -> str:
        """
        Determine the type of page based on URL and title
        
        Args:
            url: Page URL
            title: Page title
            is_homepage: Whether this is the homepage
            
        Returns:
            Page type (homepage, about, services, contact, etc.)
        """
        if is_homepage:
            return "homepage"
        
        url_lower = url.lower()
        title_lower = title.lower()
        
        # Check URL and title for keywords
        if any(keyword in url_lower or keyword in title_lower for keyword in ['about', 'about-us', 'who-we-are']):
            return "about"
        elif any(keyword in url_lower or keyword in title_lower for keyword in ['service', 'services', 'what-we-do']):
            return "services"
        elif any(keyword in url_lower or keyword in title_lower for keyword in ['contact', 'contact-us', 'get-in-touch']):
            return "contact"
        elif any(keyword in url_lower or keyword in title_lower for keyword in ['product', 'products']):
            return "products"
        elif any(keyword in url_lower or keyword in title_lower for keyword in ['faq', 'help', 'support']):
            return "faq"
        else:
            return "other"
    
    def _extract_nap_data(self, text: str) -> Dict[str, Optional[str]]:
        """
        Extract NAP (Name, Address, Phone) data from text
        
        Args:
            text: Clean text content
            
        Returns:
            Dictionary with extracted NAP data
        """
        nap_data = {
            'extracted_name': None,
            'extracted_address': None,
            'extracted_phone': None
        }
        
        # Extract phone numbers (US format)
        phone_pattern = r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b'
        phone_match = re.search(phone_pattern, text)
        if phone_match:
            nap_data['extracted_phone'] = phone_match.group(0)
        
        # Extract addresses (simple pattern - look for US zip codes)
        address_pattern = r'\b\d{1,5}\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)[\w\s,]*\b\d{5}(?:-\d{4})?\b'
        address_match = re.search(address_pattern, text, re.IGNORECASE)
        if address_match:
            nap_data['extracted_address'] = address_match.group(0).strip()
        
        return nap_data


async def run_playwright_crawler(start_url: str, max_pages: int = 30, max_depth: int = 2) -> List[Dict]:
    """
    Run Playwright crawler and return results
    
    Args:
        start_url: The website URL to crawl
        max_pages: Maximum number of pages to crawl
        max_depth: Maximum depth to crawl
        
    Returns:
        List of page data dictionaries
    """
    crawler = PlaywrightCrawler(start_url, max_pages, max_depth)
    return await crawler.crawl()
