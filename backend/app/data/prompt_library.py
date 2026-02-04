"""
GEO Analysis Prompt Library
============================

22 prompts across 5 categories for comprehensive GEO Entity Optimization analysis.
Each prompt is designed to generate structured, explainable AI outputs with citations.

Temperature: ≤0.3 for deterministic outputs
LangChain: All prompts executed through LangChain framework
Citations: All responses must cite sources (URLs, review IDs, page IDs)
"""

from typing import List, Dict, Any

# Category 1: Entity Definition (5 prompts)
# Focus: Understanding what the business IS
ENTITY_DEFINITION_PROMPTS = [
    {
        "prompt_id": "entity_def_001",
        "version": "1.0",
        "category": "entity_definition",
        "title": "Core Business Identity",
        "description": "Extract the fundamental identity, mission, and core purpose of the business from website content and About pages.",
        "prompt_text": """Analyze the provided business data and identify:
1. Primary business identity (what they are, not just what they do)
2. Core mission statement or value proposition
3. Founding story or origin context
4. Key differentiators that define this business

Use ONLY the provided website content, About pages, and business profile data. 
Cite specific pages or sections for each point.

Return a JSON object with: identity, mission, founding_context, differentiators (each with text and source_url).""",
        "system_message": "You are a business analyst specializing in brand identity extraction. Provide factual, citation-backed analysis only.",
        "temperature": 0.2,
        "max_tokens": 600,
        "expected_output_schema": {
            "type": "object",
            "required": ["identity", "mission", "differentiators"],
            "properties": {
                "identity": {
                    "type": "object",
                    "properties": {
                        "text": {"type": "string"},
                        "source_url": {"type": "string"}
                    }
                },
                "mission": {
                    "type": "object",
                    "properties": {
                        "text": {"type": "string"},
                        "source_url": {"type": "string"}
                    }
                },
                "founding_context": {
                    "type": "object",
                    "properties": {
                        "text": {"type": "string"},
                        "source_url": {"type": "string"}
                    }
                },
                "differentiators": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "text": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                }
            }
        },
        "scoring_weight": 1.0,
        "execution_order": 1
    },
    {
        "prompt_id": "entity_def_002",
        "version": "1.0",
        "category": "entity_definition",
        "title": "Service Portfolio Analysis",
        "description": "Catalog all products/services offered, their categorization, and pricing structure if available.",
        "prompt_text": """Extract a comprehensive catalog of products/services offered by this business:
1. List all explicitly mentioned products or services
2. Group them into logical categories
3. Identify any pricing information if available
4. Note flagship or highlighted offerings

Cite the specific pages where each product/service is mentioned.

Return JSON with: services (array), categories (array), pricing_available (boolean), flagship_offerings (array).""",
        "system_message": "You are a product catalog specialist. Extract only explicitly stated offerings with precise citations.",
        "temperature": 0.15,
        "max_tokens": 700,
        "expected_output_schema": {
            "type": "object",
            "required": ["services", "categories", "pricing_available"],
            "properties": {
                "services": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "description": {"type": "string"},
                            "category": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "categories": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "pricing_available": {"type": "boolean"},
                "flagship_offerings": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                }
            }
        },
        "scoring_weight": 1.0,
        "execution_order": 2
    },
    {
        "prompt_id": "entity_def_003",
        "version": "1.0",
        "category": "entity_definition",
        "title": "Target Audience Identification",
        "description": "Identify who the business serves - customer segments, demographics, industries, or personas.",
        "prompt_text": """Analyze the business data to identify target audience(s):
1. Explicit customer segments mentioned (e.g., "We serve small businesses")
2. Implicit audience signals (language, imagery, case studies)
3. Industries or verticals targeted
4. Geographic focus if specified

Cite evidence for each audience segment identified.

Return JSON: audience_segments (array with segment, evidence, source_url).""",
        "system_message": "You are a market segmentation analyst. Identify target audiences based on explicit statements and implicit signals.",
        "temperature": 0.25,
        "max_tokens": 500,
        "expected_output_schema": {
            "type": "object",
            "required": ["audience_segments"],
            "properties": {
                "audience_segments": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "segment": {"type": "string"},
                            "evidence": {"type": "string"},
                            "confidence": {"type": "string", "enum": ["explicit", "implicit"]},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "geographic_focus": {
                    "type": "object",
                    "properties": {
                        "locations": {"type": "array", "items": {"type": "string"}},
                        "source_url": {"type": "string"}
                    }
                }
            }
        },
        "scoring_weight": 0.9,
        "execution_order": 3
    },
    {
        "prompt_id": "entity_def_004",
        "version": "1.0",
        "category": "entity_definition",
        "title": "Brand Personality & Tone",
        "description": "Extract the brand voice, personality traits, and communication style from content.",
        "prompt_text": """Analyze the language and messaging style across website content to characterize brand personality:
1. Tone of voice (formal, casual, technical, friendly, etc.)
2. Key personality traits conveyed
3. Recurring themes or messaging patterns
4. Brand adjectives (how they want to be perceived)

Provide specific text examples as evidence for each trait identified.

Return JSON: tone, personality_traits (array), themes (array), brand_adjectives (array), each with example text and source_url.""",
        "system_message": "You are a brand voice analyst. Characterize communication style based on textual evidence.",
        "temperature": 0.25,
        "max_tokens": 500,
        "expected_output_schema": {
            "type": "object",
            "required": ["tone", "personality_traits"],
            "properties": {
                "tone": {
                    "type": "object",
                    "properties": {
                        "description": {"type": "string"},
                        "examples": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "text": {"type": "string"},
                                    "source_url": {"type": "string"}
                                }
                            }
                        }
                    }
                },
                "personality_traits": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "trait": {"type": "string"},
                            "evidence": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "themes": {"type": "array", "items": {"type": "string"}},
                "brand_adjectives": {"type": "array", "items": {"type": "string"}}
            }
        },
        "scoring_weight": 0.7,
        "execution_order": 4
    },
    {
        "prompt_id": "entity_def_005",
        "version": "1.0",
        "category": "entity_definition",
        "title": "NAP & Contact Information",
        "description": "Extract Name, Address, Phone, and all contact methods consistently.",
        "prompt_text": """Extract all contact information present in the business data:
1. Business name (legal and DBA if different)
2. Physical address(es) - full street address, city, state, ZIP
3. Phone number(s) - with format and type (main, support, etc.)
4. Email address(es) - with purpose if specified
5. Additional contact methods (social media, forms, chat)

Check for consistency across different pages. Flag any discrepancies.

Return JSON: business_name, addresses (array), phone_numbers (array), emails (array), other_contacts (array), consistency_check.""",
        "system_message": "You are a NAP consistency auditor. Extract precise contact information and verify consistency.",
        "temperature": 0.1,
        "max_tokens": 600,
        "expected_output_schema": {
            "type": "object",
            "required": ["business_name", "addresses", "phone_numbers"],
            "properties": {
                "business_name": {
                    "type": "object",
                    "properties": {
                        "legal_name": {"type": "string"},
                        "dba_name": {"type": "string"},
                        "source_url": {"type": "string"}
                    }
                },
                "addresses": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "full_address": {"type": "string"},
                            "street": {"type": "string"},
                            "city": {"type": "string"},
                            "state": {"type": "string"},
                            "zip": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "phone_numbers": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "number": {"type": "string"},
                            "type": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "emails": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "email": {"type": "string"},
                            "purpose": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "consistency_check": {
                    "type": "object",
                    "properties": {
                        "is_consistent": {"type": "boolean"},
                        "discrepancies": {"type": "array", "items": {"type": "string"}}
                    }
                }
            }
        },
        "scoring_weight": 1.0,
        "execution_order": 5
    }
]

# Category 2: Category Visibility (4 prompts)
# Focus: How the business appears in search and category contexts
CATEGORY_VISIBILITY_PROMPTS = [
    {
        "prompt_id": "cat_vis_001",
        "version": "1.0",
        "category": "category_visibility",
        "title": "Primary Category Classification",
        "description": "Determine the primary business category/industry based on services offered and self-description.",
        "prompt_text": """Based on the business's services, self-description, and content, determine:
1. Primary business category (use standard Google Business Categories when possible)
2. Secondary categories (up to 3)
3. Industry classification
4. Evidence for each category assignment

Return JSON: primary_category, secondary_categories (array), industry, evidence (array with text and source_url).""",
        "system_message": "You are a business categorization specialist. Assign categories based on explicit offerings and industry signals.",
        "temperature": 0.2,
        "max_tokens": 400,
        "expected_output_schema": {
            "type": "object",
            "required": ["primary_category", "industry"],
            "properties": {
                "primary_category": {
                    "type": "object",
                    "properties": {
                        "category": {"type": "string"},
                        "confidence": {"type": "number"},
                        "evidence": {"type": "string"},
                        "source_url": {"type": "string"}
                    }
                },
                "secondary_categories": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "category": {"type": "string"},
                            "evidence": {"type": "string"}
                        }
                    }
                },
                "industry": {"type": "string"}
            }
        },
        "scoring_weight": 1.0,
        "execution_order": 1
    },
    {
        "prompt_id": "cat_vis_002",
        "version": "1.0",
        "category": "category_visibility",
        "title": "Keyword & Topic Coverage",
        "description": "Identify key topics and keywords the business covers in their content.",
        "prompt_text": """Analyze website content to extract:
1. Primary topics covered (3-5 main themes)
2. Key phrases and terminology used consistently
3. Expertise areas claimed or demonstrated
4. Content gaps (topics competitors might cover but this business doesn't)

Return JSON: primary_topics (array), key_phrases (array), expertise_areas (array), content_gaps (array with reasoning).""",
        "system_message": "You are an SEO content analyst. Identify topics and keywords based on actual content.",
        "temperature": 0.25,
        "max_tokens": 600,
        "expected_output_schema": {
            "type": "object",
            "required": ["primary_topics", "key_phrases"],
            "properties": {
                "primary_topics": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "topic": {"type": "string"},
                            "frequency": {"type": "string"},
                            "source_urls": {"type": "array", "items": {"type": "string"}}
                        }
                    }
                },
                "key_phrases": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "phrase": {"type": "string"},
                            "context": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "expertise_areas": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "content_gaps": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "gap": {"type": "string"},
                            "reasoning": {"type": "string"}
                        }
                    }
                }
            }
        },
        "scoring_weight": 0.9,
        "execution_order": 2
    },
    {
        "prompt_id": "cat_vis_003",
        "version": "1.0",
        "category": "category_visibility",
        "title": "Directory & Citation Presence",
        "description": "Analyze where the business is mentioned in online directories, listings, and citations.",
        "prompt_text": """Based on brand mention data, identify:
1. Directories and listing sites where business appears
2. Citation consistency (NAP matching across sources)
3. High-authority directories present/missing
4. Quality of directory profiles (complete vs. incomplete)

Return JSON: directories (array with name, url, profile_completeness), citation_consistency_score, high_authority_present (array), recommendations (array).""",
        "system_message": "You are a local SEO citation analyst. Evaluate directory presence and consistency.",
        "temperature": 0.2,
        "max_tokens": 600,
        "expected_output_schema": {
            "type": "object",
            "required": ["directories", "citation_consistency_score"],
            "properties": {
                "directories": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "url": {"type": "string"},
                            "profile_completeness": {"type": "string", "enum": ["complete", "partial", "minimal"]},
                            "mention_id": {"type": "string"}
                        }
                    }
                },
                "citation_consistency_score": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1
                },
                "high_authority_present": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "high_authority_missing": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "recommendations": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        },
        "scoring_weight": 0.8,
        "execution_order": 3
    },
    {
        "prompt_id": "cat_vis_004",
        "version": "1.0",
        "category": "category_visibility",
        "title": "Search Visibility Assessment",
        "description": "Assess how the business is positioned in search results based on mention data.",
        "prompt_text": """Analyze brand mentions from search results to assess visibility:
1. Types of pages appearing (own website, reviews, articles, directories)
2. Position of mentions (top results, page 2+, etc.) if detectable
3. Query patterns that surface the business
4. Visibility gaps (topics where business should appear but doesn't)

Return JSON: mention_types (object with counts), visibility_strength (string), query_patterns (array), visibility_gaps (array).""",
        "system_message": "You are a search visibility analyst. Assess presence based on mention patterns.",
        "temperature": 0.25,
        "max_tokens": 500,
        "expected_output_schema": {
            "type": "object",
            "required": ["mention_types", "visibility_strength"],
            "properties": {
                "mention_types": {
                    "type": "object",
                    "properties": {
                        "own_website": {"type": "integer"},
                        "reviews": {"type": "integer"},
                        "articles": {"type": "integer"},
                        "directories": {"type": "integer"},
                        "social": {"type": "integer"},
                        "other": {"type": "integer"}
                    }
                },
                "visibility_strength": {
                    "type": "string",
                    "enum": ["strong", "moderate", "weak", "minimal"]
                },
                "query_patterns": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "pattern": {"type": "string"},
                            "mention_count": {"type": "integer"}
                        }
                    }
                },
                "visibility_gaps": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        },
        "scoring_weight": 0.9,
        "execution_order": 4
    }
]

# Category 3: Comparison & Alternatives (4 prompts)
# Focus: How the business compares to competitors and alternatives
COMPARISON_ALTERNATIVES_PROMPTS = [
    {
        "prompt_id": "comp_alt_001",
        "version": "1.0",
        "category": "comparison_alternatives",
        "title": "Competitor Mentions",
        "description": "Identify mentions of competitors in reviews, content, or brand mentions.",
        "prompt_text": """Analyze all data sources to identify competitor mentions:
1. Explicit competitor names mentioned
2. Context of mention (comparison, alternative, superior/inferior)
3. Frequency and sentiment of competitor references
4. Unique differentiators claimed vs. competitors

Return JSON: competitors (array with name, context, sentiment, source), differentiators_claimed (array).""",
        "system_message": "You are a competitive intelligence analyst. Identify competitor mentions and positioning.",
        "temperature": 0.2,
        "max_tokens": 600,
        "expected_output_schema": {
            "type": "object",
            "required": ["competitors"],
            "properties": {
                "competitors": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "context": {"type": "string"},
                            "sentiment": {"type": "string", "enum": ["positive", "neutral", "negative"]},
                            "mention_frequency": {"type": "integer"},
                            "source_type": {"type": "string"},
                            "source_id": {"type": "string"}
                        }
                    }
                },
                "differentiators_claimed": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "differentiator": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                }
            }
        },
        "scoring_weight": 0.9,
        "execution_order": 1
    },
    {
        "prompt_id": "comp_alt_002",
        "version": "1.0",
        "category": "comparison_alternatives",
        "title": "Alternative Solutions Mentioned",
        "description": "Identify alternative solutions or substitutes mentioned in relation to this business.",
        "prompt_text": """Identify alternatives to this business mentioned in data:
1. Direct alternatives (same service, different provider)
2. Indirect alternatives (different approach to same problem)
3. DIY or in-house alternatives mentioned
4. Context in which alternatives are discussed

Return JSON: direct_alternatives (array), indirect_alternatives (array), contexts (array with text and source).""",
        "system_message": "You are a market alternatives analyst. Identify substitute products/services mentioned.",
        "temperature": 0.25,
        "max_tokens": 500,
        "expected_output_schema": {
            "type": "object",
            "required": ["direct_alternatives"],
            "properties": {
                "direct_alternatives": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "context": {"type": "string"},
                            "source_id": {"type": "string"}
                        }
                    }
                },
                "indirect_alternatives": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {"type": "string"},
                            "context": {"type": "string"}
                        }
                    }
                },
                "contexts": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "text": {"type": "string"},
                            "source_type": {"type": "string"},
                            "source_id": {"type": "string"}
                        }
                    }
                }
            }
        },
        "scoring_weight": 0.7,
        "execution_order": 2
    },
    {
        "prompt_id": "comp_alt_003",
        "version": "1.0",
        "category": "comparison_alternatives",
        "title": "Comparative Strengths Analysis",
        "description": "Extract stated strengths and advantages claimed by or attributed to the business.",
        "prompt_text": """Identify strengths and advantages attributed to this business:
1. Self-claimed strengths (from own website/content)
2. Strengths mentioned in positive reviews
3. Advantages cited in comparison mentions
4. Unique selling propositions

Cite sources for each strength identified.

Return JSON: self_claimed_strengths (array), review_mentioned_strengths (array), comparative_advantages (array), USPs (array).""",
        "system_message": "You are a strengths extraction specialist. Identify advantages with citations.",
        "temperature": 0.25,
        "max_tokens": 600,
        "expected_output_schema": {
            "type": "object",
            "required": ["self_claimed_strengths"],
            "properties": {
                "self_claimed_strengths": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "strength": {"type": "string"},
                            "evidence": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "review_mentioned_strengths": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "strength": {"type": "string"},
                            "frequency": {"type": "integer"},
                            "review_ids": {"type": "array", "items": {"type": "string"}}
                        }
                    }
                },
                "comparative_advantages": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "advantage": {"type": "string"},
                            "context": {"type": "string"},
                            "source_id": {"type": "string"}
                        }
                    }
                },
                "USPs": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        },
        "scoring_weight": 0.9,
        "execution_order": 3
    },
    {
        "prompt_id": "comp_alt_004",
        "version": "1.0",
        "category": "comparison_alternatives",
        "title": "Comparative Weaknesses Analysis",
        "description": "Extract stated weaknesses, complaints, or areas for improvement.",
        "prompt_text": """Identify weaknesses and areas for improvement:
1. Common complaints in negative reviews
2. Gaps or limitations mentioned on own website
3. Weaknesses cited in comparison mentions
4. Recurring themes in critical feedback

Return JSON: review_complaints (array with theme, frequency, review_ids), self_acknowledged_limitations (array), comparative_weaknesses (array), improvement_themes (array).""",
        "system_message": "You are a weakness identification analyst. Extract criticism and limitations objectively.",
        "temperature": 0.25,
        "max_tokens": 600,
        "expected_output_schema": {
            "type": "object",
            "required": ["review_complaints"],
            "properties": {
                "review_complaints": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "theme": {"type": "string"},
                            "frequency": {"type": "integer"},
                            "severity": {"type": "string", "enum": ["minor", "moderate", "major"]},
                            "review_ids": {"type": "array", "items": {"type": "string"}}
                        }
                    }
                },
                "self_acknowledged_limitations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "limitation": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "comparative_weaknesses": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "weakness": {"type": "string"},
                            "context": {"type": "string"}
                        }
                    }
                },
                "improvement_themes": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        },
        "scoring_weight": 0.9,
        "execution_order": 4
    }
]

# Category 4: Trust & Reviews (5 prompts)
# Focus: Reputation, credibility, and review analysis
TRUST_REVIEWS_PROMPTS = [
    {
        "prompt_id": "trust_rev_001",
        "version": "1.0",
        "category": "trust_reviews",
        "title": "Overall Review Sentiment",
        "description": "Analyze aggregate sentiment from all available reviews.",
        "prompt_text": """Analyze Google reviews to determine overall sentiment:
1. Distribution of ratings (1-5 stars)
2. Overall sentiment (positive, neutral, negative percentages)
3. Sentiment trends over time if timestamps available
4. Comparison to typical industry sentiment

Return JSON: rating_distribution (object), overall_sentiment (object with percentages), trend (string), industry_comparison (string if available).""",
        "system_message": "You are a review sentiment analyst. Provide factual, data-driven sentiment analysis.",
        "temperature": 0.15,
        "max_tokens": 400,
        "expected_output_schema": {
            "type": "object",
            "required": ["rating_distribution", "overall_sentiment"],
            "properties": {
                "rating_distribution": {
                    "type": "object",
                    "properties": {
                        "5_star": {"type": "integer"},
                        "4_star": {"type": "integer"},
                        "3_star": {"type": "integer"},
                        "2_star": {"type": "integer"},
                        "1_star": {"type": "integer"}
                    }
                },
                "overall_sentiment": {
                    "type": "object",
                    "properties": {
                        "positive_percent": {"type": "number"},
                        "neutral_percent": {"type": "number"},
                        "negative_percent": {"type": "number"}
                    }
                },
                "trend": {
                    "type": "string",
                    "enum": ["improving", "stable", "declining", "insufficient_data"]
                },
                "average_rating": {"type": "number"},
                "total_reviews": {"type": "integer"}
            }
        },
        "scoring_weight": 1.0,
        "execution_order": 1
    },
    {
        "prompt_id": "trust_rev_002",
        "version": "1.0",
        "category": "trust_reviews",
        "title": "Common Praise Themes",
        "description": "Extract recurring positive themes from reviews.",
        "prompt_text": """Analyze positive reviews (4-5 stars) to identify common praise themes:
1. Most frequently mentioned strengths
2. Specific attributes customers appreciate
3. Staff/service quality mentions
4. Product/service quality highlights

Group similar mentions into themes and rank by frequency.

Return JSON: praise_themes (array with theme, frequency, example_review_ids), top_attributes (array), quality_mentions (object).""",
        "system_message": "You are a positive review thematic analyst. Extract and categorize praise patterns.",
        "temperature": 0.2,
        "max_tokens": 600,
        "expected_output_schema": {
            "type": "object",
            "required": ["praise_themes"],
            "properties": {
                "praise_themes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "theme": {"type": "string"},
                            "frequency": {"type": "integer"},
                            "percentage": {"type": "number"},
                            "example_review_ids": {"type": "array", "items": {"type": "string"}},
                            "representative_quote": {"type": "string"}
                        }
                    }
                },
                "top_attributes": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "quality_mentions": {
                    "type": "object",
                    "properties": {
                        "staff_quality": {"type": "integer"},
                        "product_quality": {"type": "integer"},
                        "service_quality": {"type": "integer"}
                    }
                }
            }
        },
        "scoring_weight": 1.0,
        "execution_order": 2
    },
    {
        "prompt_id": "trust_rev_003",
        "version": "1.0",
        "category": "trust_reviews",
        "title": "Common Complaint Themes",
        "description": "Extract recurring negative themes from reviews.",
        "prompt_text": """Analyze negative reviews (1-3 stars) to identify common complaint themes:
1. Most frequently mentioned issues
2. Severity of complaints (minor vs. major)
3. Operational issues vs. quality issues
4. Response rate to negative reviews

Group similar complaints into themes and rank by frequency.

Return JSON: complaint_themes (array with theme, frequency, severity, example_review_ids), issue_types (object), response_rate (number).""",
        "system_message": "You are a complaint thematic analyst. Extract and categorize negative feedback patterns.",
        "temperature": 0.2,
        "max_tokens": 600,
        "expected_output_schema": {
            "type": "object",
            "required": ["complaint_themes"],
            "properties": {
                "complaint_themes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "theme": {"type": "string"},
                            "frequency": {"type": "integer"},
                            "percentage": {"type": "number"},
                            "severity": {"type": "string", "enum": ["minor", "moderate", "major"]},
                            "example_review_ids": {"type": "array", "items": {"type": "string"}},
                            "representative_quote": {"type": "string"}
                        }
                    }
                },
                "issue_types": {
                    "type": "object",
                    "properties": {
                        "operational": {"type": "integer"},
                        "quality": {"type": "integer"},
                        "communication": {"type": "integer"},
                        "pricing": {"type": "integer"}
                    }
                },
                "response_rate": {
                    "type": "number",
                    "description": "Percentage of negative reviews with business response"
                }
            }
        },
        "scoring_weight": 1.0,
        "execution_order": 3
    },
    {
        "prompt_id": "trust_rev_004",
        "version": "1.0",
        "category": "trust_reviews",
        "title": "Trust Signals & Credentials",
        "description": "Identify trust signals, certifications, awards, and credibility markers.",
        "prompt_text": """Identify trust signals present in business data:
1. Certifications and licenses mentioned
2. Awards and recognitions
3. Professional affiliations
4. Years in business / establishment date
5. Trust badges or security certifications
6. Third-party validations

Cite sources for each trust signal identified.

Return JSON: certifications (array), awards (array), affiliations (array), years_in_business (number), trust_badges (array), third_party_validations (array).""",
        "system_message": "You are a credibility assessment specialist. Identify trust signals with precise citations.",
        "temperature": 0.15,
        "max_tokens": 500,
        "expected_output_schema": {
            "type": "object",
            "required": ["certifications"],
            "properties": {
                "certifications": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "issuing_body": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "awards": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "year": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "affiliations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "organization": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "years_in_business": {
                    "type": "object",
                    "properties": {
                        "years": {"type": "number"},
                        "established_year": {"type": "string"},
                        "source_url": {"type": "string"}
                    }
                },
                "trust_badges": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "third_party_validations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string"},
                            "source": {"type": "string"}
                        }
                    }
                }
            }
        },
        "scoring_weight": 0.8,
        "execution_order": 4
    },
    {
        "prompt_id": "trust_rev_005",
        "version": "1.0",
        "category": "trust_reviews",
        "title": "Review Response Quality",
        "description": "Analyze how the business responds to reviews (if at all).",
        "prompt_text": """Analyze business responses to reviews:
1. Response rate (% of reviews with responses)
2. Average response time if detectable
3. Quality of responses (personalized vs. generic)
4. Handling of negative reviews
5. Response tone and professionalism

Return JSON: response_rate (number), response_quality (object), negative_handling (string), tone_assessment (string), examples (array with review_id, response_text, quality_rating).""",
        "system_message": "You are a review response quality analyst. Assess response patterns and quality.",
        "temperature": 0.25,
        "max_tokens": 600,
        "expected_output_schema": {
            "type": "object",
            "required": ["response_rate", "response_quality"],
            "properties": {
                "response_rate": {
                    "type": "number",
                    "description": "Percentage of reviews with business response"
                },
                "response_quality": {
                    "type": "object",
                    "properties": {
                        "personalized_percent": {"type": "number"},
                        "generic_percent": {"type": "number"},
                        "average_length": {"type": "integer"}
                    }
                },
                "negative_handling": {
                    "type": "string",
                    "enum": ["excellent", "good", "fair", "poor", "no_responses"]
                },
                "tone_assessment": {
                    "type": "string",
                    "enum": ["professional", "friendly", "defensive", "apologetic", "mixed"]
                },
                "examples": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "review_id": {"type": "string"},
                            "review_rating": {"type": "integer"},
                            "response_text": {"type": "string"},
                            "quality_rating": {"type": "string", "enum": ["excellent", "good", "poor"]}
                        }
                    }
                }
            }
        },
        "scoring_weight": 0.7,
        "execution_order": 5
    }
]

# Category 5: Local Discovery (4 prompts)
# Focus: Local search presence and geographic relevance
LOCAL_DISCOVERY_PROMPTS = [
    {
        "prompt_id": "local_disc_001",
        "version": "1.0",
        "category": "local_discovery",
        "title": "Geographic Service Area",
        "description": "Determine the geographic area(s) the business serves.",
        "prompt_text": """Identify the geographic service area(s):
1. Explicitly stated service areas (cities, counties, regions)
2. Physical location addresses
3. "Serving" or "We cover" statements
4. Service radius if mentioned

Return JSON: explicit_areas (array), physical_locations (array), service_radius (object), geographic_keywords (array with keyword, source_url).""",
        "system_message": "You are a geographic service area analyst. Extract location coverage with citations.",
        "temperature": 0.15,
        "max_tokens": 400,
        "expected_output_schema": {
            "type": "object",
            "required": ["explicit_areas", "physical_locations"],
            "properties": {
                "explicit_areas": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "area": {"type": "string"},
                            "type": {"type": "string", "enum": ["city", "county", "state", "region"]},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "physical_locations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "address": {"type": "string"},
                            "city": {"type": "string"},
                            "state": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "service_radius": {
                    "type": "object",
                    "properties": {
                        "radius_miles": {"type": "number"},
                        "source_url": {"type": "string"}
                    }
                },
                "geographic_keywords": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "keyword": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                }
            }
        },
        "scoring_weight": 1.0,
        "execution_order": 1
    },
    {
        "prompt_id": "local_disc_002",
        "version": "1.0",
        "category": "local_discovery",
        "title": "Local SEO Content Signals",
        "description": "Identify local SEO elements in content (city names, landmarks, local keywords).",
        "prompt_text": """Analyze content for local SEO signals:
1. City and neighborhood names mentioned
2. Local landmarks or points of reference
3. Local keywords (e.g., "near [landmark]")
4. Localized service pages
5. Local event mentions

Return JSON: city_mentions (array with city, frequency), landmarks (array), local_keywords (array), localized_pages (array with title, url), local_events (array).""",
        "system_message": "You are a local SEO content analyst. Extract geographic and local context signals.",
        "temperature": 0.2,
        "max_tokens": 500,
        "expected_output_schema": {
            "type": "object",
            "required": ["city_mentions"],
            "properties": {
                "city_mentions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "city": {"type": "string"},
                            "frequency": {"type": "integer"},
                            "source_urls": {"type": "array", "items": {"type": "string"}}
                        }
                    }
                },
                "landmarks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "source_url": {"type": "string"}
                        }
                    }
                },
                "local_keywords": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "keyword": {"type": "string"},
                            "context": {"type": "string"}
                        }
                    }
                },
                "localized_pages": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "url": {"type": "string"}
                        }
                    }
                },
                "local_events": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        },
        "scoring_weight": 0.8,
        "execution_order": 2
    },
    {
        "prompt_id": "local_disc_003",
        "version": "1.0",
        "category": "local_discovery",
        "title": "Local Link & Mention Analysis",
        "description": "Analyze mentions on local websites, news, blogs, and community sites.",
        "prompt_text": """Analyze brand mentions for local presence:
1. Mentions on local news sites
2. Mentions on local community blogs/forums
3. Mentions on local business associations
4. Local event participation mentions
5. Local partnerships mentioned

Return JSON: local_news (array), community_sites (array), associations (array), events (array), partnerships (array), all with mention_id and url.""",
        "system_message": "You are a local link and mention analyst. Identify local digital footprint.",
        "temperature": 0.2,
        "max_tokens": 500,
        "expected_output_schema": {
            "type": "object",
            "required": ["local_news", "community_sites"],
            "properties": {
                "local_news": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "site_name": {"type": "string"},
                            "mention_id": {"type": "string"},
                            "url": {"type": "string"},
                            "context": {"type": "string"}
                        }
                    }
                },
                "community_sites": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "site_name": {"type": "string"},
                            "mention_id": {"type": "string"},
                            "url": {"type": "string"}
                        }
                    }
                },
                "associations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "mention_id": {"type": "string"}
                        }
                    }
                },
                "events": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "event_name": {"type": "string"},
                            "mention_id": {"type": "string"}
                        }
                    }
                },
                "partnerships": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "partner_name": {"type": "string"},
                            "mention_id": {"type": "string"}
                        }
                    }
                }
            }
        },
        "scoring_weight": 0.7,
        "execution_order": 3
    },
    {
        "prompt_id": "local_disc_004",
        "version": "1.0",
        "category": "local_discovery",
        "title": "Hours & Availability Info",
        "description": "Extract business hours, availability, and operational information.",
        "prompt_text": """Extract operational information:
1. Business hours (regular and special)
2. Days of operation
3. Holiday hours if mentioned
4. Appointment availability
5. Emergency/after-hours service availability

Return JSON: regular_hours (object), special_hours (array), days_of_operation (array), appointment_info (object), emergency_service (boolean), source_urls (array).""",
        "system_message": "You are an operational data extraction specialist. Extract precise hours and availability info.",
        "temperature": 0.1,
        "max_tokens": 400,
        "expected_output_schema": {
            "type": "object",
            "required": ["regular_hours"],
            "properties": {
                "regular_hours": {
                    "type": "object",
                    "properties": {
                        "monday": {"type": "string"},
                        "tuesday": {"type": "string"},
                        "wednesday": {"type": "string"},
                        "thursday": {"type": "string"},
                        "friday": {"type": "string"},
                        "saturday": {"type": "string"},
                        "sunday": {"type": "string"},
                        "source_url": {"type": "string"}
                    }
                },
                "special_hours": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "date_or_holiday": {"type": "string"},
                            "hours": {"type": "string"}
                        }
                    }
                },
                "days_of_operation": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "appointment_info": {
                    "type": "object",
                    "properties": {
                        "required": {"type": "boolean"},
                        "booking_url": {"type": "string"},
                        "details": {"type": "string"}
                    }
                },
                "emergency_service": {
                    "type": "boolean"
                },
                "source_urls": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        },
        "scoring_weight": 0.6,
        "execution_order": 4
    }
]

# Aggregate all prompts
ALL_PROMPTS: List[Dict[str, Any]] = (
    ENTITY_DEFINITION_PROMPTS +
    CATEGORY_VISIBILITY_PROMPTS +
    COMPARISON_ALTERNATIVES_PROMPTS +
    TRUST_REVIEWS_PROMPTS +
    LOCAL_DISCOVERY_PROMPTS
)

def get_prompts_by_category(category: str) -> List[Dict[str, Any]]:
    """Get all prompts for a specific category."""
    return [p for p in ALL_PROMPTS if p["category"] == category]

def get_prompt_by_id(prompt_id: str) -> Dict[str, Any]:
    """Get a single prompt by its ID."""
    for prompt in ALL_PROMPTS:
        if prompt["prompt_id"] == prompt_id:
            return prompt
    raise ValueError(f"Prompt with ID '{prompt_id}' not found")

def get_all_prompt_ids() -> List[str]:
    """Get list of all prompt IDs."""
    return [p["prompt_id"] for p in ALL_PROMPTS]

def get_prompts_summary() -> Dict[str, int]:
    """Get summary count of prompts by category."""
    summary = {}
    for prompt in ALL_PROMPTS:
        category = prompt["category"]
        summary[category] = summary.get(category, 0) + 1
    return summary

if __name__ == "__main__":
    print("GEO Prompt Library Summary:")
    print(f"Total Prompts: {len(ALL_PROMPTS)}")
    print("\nBy Category:")
    for category, count in get_prompts_summary().items():
        print(f"  {category}: {count} prompts")
    print("\nAll Prompt IDs:")
    for prompt_id in get_all_prompt_ids():
        print(f"  - {prompt_id}")
