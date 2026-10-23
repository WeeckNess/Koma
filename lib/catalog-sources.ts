// These are ten catalogues, not ten independent image databases: some share artwork.
export const CATALOG_SOURCES = [
 {id:'glenat',name:'Glénat',url:'https://www.glenat.com',scope:'Éditions françaises Glénat'},
 {id:'google',name:'Google Books',url:'https://books.google.com',scope:'Catalogue international'},
 {id:'openlibrary',name:'Open Library',url:'https://openlibrary.org',scope:'Catalogue international et couvertures'},
 {id:'bnf',name:'BnF',url:'https://api.bnf.fr/fr/api-service-couvertures-du-catalogue-general',scope:'Couvertures françaises par EAN'},
 {id:'pika',name:'Pika',url:'https://www.pika.fr',scope:'Catalogue officiel Pika'},
 {id:'nobi',name:'nobi nobi !',url:'https://www.nobi-nobi.fr',scope:'Catalogue officiel nobi nobi !'},
 {id:'hachette',name:'Hachette',url:'https://www.hachette.fr',scope:'Catalogue distributeur · sélection manga'},
 {id:'prh',name:'Penguin Random House',url:'https://developer.penguinrandomhouse.com/docs/read/enhanced_prh_api/concepts/Images',scope:'Couvertures d’éditions anglophones'},
 {id:'inventaire',name:'Inventaire',url:'https://inventaire.io',scope:'Éditions et couvertures communautaires'},
 {id:'openbd',name:'openBD',url:'https://openbd.jp',scope:'Éditions japonaises uniquement'},
] as const;
