$(document).ready(function(){
	$.getJSON("https://spreadsheets.google.com/feeds/list/1V1Lvg5AIKx9k0YmRhmTxYtv1Pn9dbTI--D8ejGKwPtk/od6/public/values?alt=json", 
	function(data){ 
		data = data['feed']['entry'];
		console.log(data);
		showGoods(data);
	});
	
	function showGoods(data){
		var out ='';
		
		for(var i=0; i<data.length; i++){	
			out +=`<Div class="Char">`;
			out += `<Div class="nik"><Span class="name">${data[i]['gsx$nik']['$t']}</span><Div class="LvLbox"><Span class="LvL">Ур ${data[i]['gsx$ур']['$t']}</span><Span class="HM">+ ${data[i]['gsx$хм']['$t']}</span></span><Span class="SP">Спецелезация:  ${data[i]['gsx$спецелезация']['$t']}</span></Div><Span class="TEG"><BR>${data[i]['gsx$заметка']['$t']}</span></Div>`;
			out +=`<Div class="Inv">`;
			out += `<Div class="Gear"><span class="ItemTeg">Кольцо:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$кольцо']['$t']}</span><Span class="ItemLvL">    Ур:    ${data[i]['gsx$уркольца']['$t']}</span></Div></Div>`;
			out += `<Div class="Gear"><span class="ItemTeg">Серьга:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$серьга']['$t']}</span><Span class="ItemLvL">    Ур:    ${data[i]['gsx$урсерьги']['$t']}</span></Div></Div>`;
			out += `<Div class="Gear"><span class="ItemTeg">Ожерелья:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$ожерелья']['$t']}</span><Span class="ItemLvL">    Ур:    ${data[i]['gsx$урожерелья']['$t']}</span></Div></Div>`;
			out += `<Div class="Gear"><span class="ItemTeg">Браслет:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$браслет']['$t']}</span><Span class="ItemLvL">    Ур:    ${data[i]['gsx$урбраслета']['$t']}</span></Div></Div>`;
			out +=`</Div>`;
			out +=`<Div class="Inv">`;
			out += `<Div class="Gear"><span class="ItemTeg">Пояс:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$пояс']['$t']}</span><Span class="ItemLvL">    Ур:    ${data[i]['gsx$урпояса']['$t']}</span></Div></Div>`;
			out += `<Div class="Gear"><span class="ItemTeg">Перчатка:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$перчатка']['$t']}</span><Span class="ItemLvL">    Ур:    ${data[i]['gsx$урперчатки']['$t']}</span></Div></Div>`;
			out += `<Div class="Gear"><span class="ItemTeg">Подвеска:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$подвеска']['$t']}</span></Div></Div>`;
			out += `<Div class="Gear"><span class="ItemTeg">Символ:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$символ']['$t']}</span></Div></Div>`;
			out +=`</Div>`;
			out +=`<Div class="Inv">`;
			out += `<Div class="Gear"><span class="ItemTeg">Сфера:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$сфера']['$t']}</span><Span class="ItemLvL">    Ур:    ${data[i]['gsx$урсферы']['$t']}</span></Div></Div>`;
			out += `<Div class="Gear"><span class="ItemTeg">Душа:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$душа']['$t']}</span><Span class="ItemLvL">    Ур:    ${data[i]['gsx$урдуши']['$t']}</span></Div></Div>`;
			out += `<Div class="Gear"><span class="ItemTeg">Петомиц:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$петомиц']['$t']}</span><Span class="ItemLvL">    Ур:    ${data[i]['gsx$урпетомца']['$t']}</span></Div></Div>`;
			out += `<Div class="Gear"><span class="ItemTeg">Кулон:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$кулон']['$t']}</span><Span class="ItemLvL">    Ур:    ${data[i]['gsx$уркулона']['$t']}</span></Div></Div>`;
			out +=`</Div>`;
			out +=`<Div class="Inv">`;
			out += `<Div class="Gear2"><span class="ItemTeg">Триграмма 1:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$триграмма1']['$t']}</Div></Div>`;
			out += `<Div class="Gear2"><span class="ItemTeg">Триграмма 2:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$триграмма2']['$t']}</Div></Div>`;
			out += `<Div class="Gear2"><span class="ItemTeg">Триграмма 3:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$триграмма3']['$t']}</Div></Div>`;
			out += `<Div class="Gear2"><span class="ItemTeg">Триграмма 4:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$триграмма4']['$t']}</Div></Div>`;
			out += `<Div class="Gear2"><span class="ItemTeg">Триграмма 5:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$триграмма5']['$t']}</Div></Div>`;
			out += `<Div class="Gear2"><span class="ItemTeg">Триграмма 6:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$триграмма6']['$t']}</Div></Div>`;
			out += `<Div class="Gear2"><span class="ItemTeg">Триграмма 7:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$триграмма7']['$t']}</Div></Div>`;
			out += `<Div class="Gear2"><span class="ItemTeg">Триграмма 8:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$триграмма8']['$t']}</Div></Div>`;
			out +=`</Div>`;
			out +=`<Div class="Inv">`;
			out += `<Div class="Gear3"><span class="ItemTeg">Професия 1:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$професия1']['$t']}</span><Span class="ItemLvL">    Ур:    ${data[i]['gsx$урпрофесии1']['$t']}</span></Div></Div>`;
			out += `<Div class="Gear3"><span class="ItemTeg">Професия 2:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$професия2']['$t']}</span><Span class="ItemLvL">    Ур:    ${data[i]['gsx$урпрофесии2']['$t']}</span></Div></Div>`;
			out += `<Div class="Gear3"><span class="ItemTeg">Золото:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$золото']['$t']}</span></Div></Div>`;
			out += `<Div class="Gear3"><span class="ItemTeg">Серебро:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$серебро']['$t']}</Div></Div>`;
			out += `<Div class="Gear3"><span class="ItemTeg">Медь:</Span><Div class="Itembox"><span class="Item">${data[i]['gsx$медь']['$t']}</span></Div></Div>`;
			out +=`</Div>`;
			out +=`</Div>`;
		}
		$('.sendbox').html(out);
		
	}
})