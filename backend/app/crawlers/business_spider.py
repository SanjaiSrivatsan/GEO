"""
Business website spider using Scrapy
Crawls business website and extracts clean text content
"""
import scrapy
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import CrawlSpider, Rule
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import re
from typing import Dict, List, Optional


class BusinessSpider(CrawlSpider):
    """
    Crawls a business website and extracts structured content
    
    Features:
    - Respects robots.txt
    - Depth limit: 2
    - Page limit: 30
    - Extracts homepage, about, services, contact pages
    - Cleans HTML and extracts text only
    """
    
    name = 'business_spider'
    
    # Custom settings
    custom_settings = {
        'ROBOTSTXT_OBEY': True,
        'CONCURRENT_REQUESTS': 8,
        'DOWNLOAD_DELAY': 0.5,  # Be polite
        'DEPTH_LIMIT': 2,
        'CLOSESPIDER_PAGECOUNT': 30,
        'USER_AGENT': 'GEO-BusinessCrawler/1.0 (+https://geo-platform.com/bot)',
        'HTTPERROR_ALLOW_ALL': False,
        'RETRY_ENABLED': True,
        'RETRY_TIMES': 2,
        'DOWNLOAD_TIMEOUT': 15,
        'LOG_LEVEL': 'INFO',
    }
    
    # Link extraction rules
    rules = (
        Rule(
            LinkExtractor(
                allow_domains=None,  # Set dynamically in __init__
                deny_extensions=['jpg', 'jpeg', 'png', 'gif', 'pdf', 'zip', 'mp4', 'mp3'],
                tags=['a'],
                attrs=['href'],
            ),
            callback='parse_page',
            follow=True
        ),
    )
    
    def __init__(self, start_url: str, allowed_domain: str, *args, **kwargs):
        """
        Initialize spider with target website
        
        Args:
            start_url: The website URL to crawl
            allowed_domain: Domain to restrict crawling to
        """
        super().__init__(*args, **kwargs)
        self.start_urls = [start_url]
        self.allowed_domains = [allowed_domain]
        self.pages_data = []
        self.page_count = 0
        
        # Update link extractor domain
        for rule in self.rules:
            rule.link_extractor.allow_domains = [allowed_domain]
    
    def parse_start_url(self, response):
        """Parse the homepage (start URL)"""
        return self.parse_page(response, is_homepage=True)
    
    def parse_page(self, response, is_homepage=False):
        """
        Parse a page and extract content
        
        Args:
            response: Scrapy response object
            is_homepage: Whether this is the homepage
        """
        self.page_count += 1
        
        # Extract page metadata
        url = response.url
        title = response.css('title::text').get() or ''
        meta_description = response.css('meta[name="description"]::attr(content)').get() or ''
        
        # Extract headings
        h1_tags = response.css('h1::text').getall()
        h2_tags = response.css('h2::text').getall()
        
        # Get raw HTML body
        raw_html = response.body.decode('utf-8', errors='ignore')
        
        # Clean and extract text
        cleaned_text = self._extract_clean_text(raw_html)
        
        # Determine page type
        page_type = self._determine_page_type(url, title, is_homepage)
        
        # Extract NAP (Name, Address, Phone) data
        nap_data = self._extract_nap_data(cleaned_text)
        
        # Calculate word count
        word_count = len(cleaned_text.split())
        
        # Store page data
        page_data = {
            'url': url,
            'page_type': page_type,
            'title': title.strip(),
            'meta_description': meta_description.strip(),
            'h1_tags': [h.strip() for h in h1_tags if h.strip()],
            'h2_tags': [h.strip() for h in h2_tags if h.strip()],
            'raw_html': raw_html,
            'cleaned_text': cleaned_text,
            'word_count': word_count,
            **nap_data
        }
        
        self.pages_data.append(page_data)
        
        yield page_data
    
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
            self.logger.error(f"Error extracting text: {e}")
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


def run_spider_sync(start_url: str) -> List[Dict]:
    """
    Run the spider synchronously and return results
    
    Args:
        start_url: The website URL to crawl
        
    Returns:
        List of page data dictionaries
    """
    from scrapy.crawler import CrawlerProcess
    from scrapy.utils.project import get_project_settings
    import logging
    
    # Parse domain from URL
    parsed_url = urlparse(start_url)
    domain = parsed_url.netloc.replace('www.', '')
    
    # Configure Scrapy settings
    settings = get_project_settings()
    settings.update({
        'ROBOTSTXT_OBEY': True,
        'CONCURRENT_REQUESTS': 8,
        'DOWNLOAD_DELAY': 0.5,
        'DEPTH_LIMIT': 2,
        'CLOSESPIDER_PAGECOUNT': 30,
        'USER_AGENT': 'GEO-BusinessCrawler/1.0 (+https://geo-platform.com/bot)',
        'LOG_LEVEL': 'INFO',
    })
    
    # Create crawler process
    process = CrawlerProcess(settings)
    
    # Store results
    results = []
    
    def collect_items(item, response, spider):
        results.append(dict(item))
    
    # Connect signal
    from scrapy import signals
    from scrapy.signalmanager import dispatcher
    dispatcher.connect(collect_items, signal=signals.item_scraped)
    
    # Run spider
    process.crawl(BusinessSpider, start_url=start_url, allowed_domain=domain)
    process.start()
    
    return results
