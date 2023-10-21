#!/usr/bin/env python3
import scrapy

class A24Spider(scrapy.Spider):
    name = 'a24'
    start_urls = ['https://a24films.com/jobs']

    def parse(self, response):
        for pos_title in response.css('*.position-title'):
            yield {'pos_title': pos_title.css('span::text').get()}

