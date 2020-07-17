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
			out += `<Div class="Box">`;
			out += `${data[i]['gsx$nik']['$t']}`;
			out += `_`;
			out += `${data[i]['gsx$хм']['$t']}`;
			out += `</Div>`;
			out += `<BR>`;
		}
		$('.sendboxx').html(out);
	}
})