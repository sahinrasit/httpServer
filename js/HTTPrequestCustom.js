//var mpdURL = "http://ube.ege.edu.tr/~cetinkaya/ubi614/bunny_ibmff_720.mpd";
var mpdURL = "http://10.0.0.1/bunny_ibmff_720.mpd";
//var mpdURL = "http://ube.ege.edu.tr/~cetinkaya/ubi614/bunny_ibmff_1080.mpd";

var baseURL, initURL, baseInitURL, rep, pCounter, cCounter, chunkDuration, t1, t2, url,reBufStartTime, bufferTimer, repLevel, lastChunkSize, throughput, 
	codecs, mimeType, bufferSize, maxSegNum, video, width, height, $mpd, ms = new MediaSource(), segNum=0, pStartT, cStartT, startupDelay, totalReBufTime, reBufferNum, reBufDuration;
var consumer = false;
var play = true;
var statistics = [];
var bwList = [];
var xhr = new XMLHttpRequest();
//throughput = 491182;
//throughput = 1546902;
var reBufStarted = false;

$('#submit').click(function() {//mpd dosyasinin alinmasi
	if ($('#mpdFilePath').val() != ""){mpdURL = $('#mpdFilePath').val()} ;

	$.ajax({
		type: "GET",
		url: mpdURL,
		dataType: "xml",
		success: xmlParser
	});
});
	
function xmlParser(mpd){
	$mpd = mpd;
	rep = $(mpd).find('Representation');
	codecs = $(rep).eq(0).attr('codecs');
	mimeType = $(rep).eq(0).attr('mimeType');
	baseURL = $(mpd).find('BaseURL').text();
	initURL = $(mpd).find('Initialization');
	baseInitURL = baseURL+initURL.eq(0).attr('sourceURL');
	//maxSegNum = 20;
	maxSegNum = $(mpd).find('Representation[id = '+rep.eq(0).attr('id')+'] > SegmentList > SegmentURL').length;
	width = $(rep).eq(0).attr('width');
	height = $(rep).eq(0).attr('height');
	chunkDuration = $(mpd).find('Representation[id = '+rep.eq(0).attr('id')+'] > SegmentList').attr('duration');
	
	//Rep'lerin her birinin bandwidth'inin yer aldigi array
	for(var i = 0 ; i < $(rep).length ; i++){
		bwList.push($(rep).eq(i).attr('bandwidth'));
	}
	init();
	startLoad();
}

function init(){
	for(var i = 0 ; i < maxSegNum; i++){
		statistics.push({
			replevel : 0,
			pCounter : 0,
			cCounter : 0,
			t2 : 0,
			throughput : 0,
			url : 0,
			size : 0
		});//statistics array initialization with 0s 
	}
	pCounter = 0;
	cCounter = 0;
	t1,t2 = 0;
	repLevel = 0;//Starting with rep 0	
	consumer = false;
	bufferSize = 10;
	reBufStartTime = 0;
	totalReBufTime = 0;
	reBufferNum = 0;
	reBufDuration = 0;
}

function startLoad(){
	pStartT = $.now();//Initialization chunk request start time.
	$.get(baseInitURL, function(data){});
	console.log("Load started : " + baseInitURL);
	getChunks();
}

function getChunks(){
	xhr.onreadystatechange = processRequest;	
	nextHTTPReq();
}
function nextHTTPReq(){
	url = nextChunk();//gets the next chunks' URLn
	console.log("requested URL : " + url);
	t1 = $.now();
	xhr.open('GET', url, true);
	xhr.send();
}
function checkBuffer(){		
	if (pCounter < maxSegNum){
		clearTimeout(bufferTimer);
		if( (pCounter - cCounter + 1) < bufferSize){			
			nextHTTPReq();
		}else{
			bufferTimer = window.setTimeout("checkBuffer()", chunkDuration*1000/4);//Wait for a 1/4 consumption time, and check buffer size if there is any room for new chunk
		}
	}
	//if(pCounter == maxSegNum)console.log("Start-up Delay : " + startupDelay);
}
function processRequest(e){	
	if (xhr.readyState == 4 && xhr.status == 200){
		t2 = $.now() - t1;//indirilmiş olan chunk'ın indirilme süresi tespit ediliyor.
		lastChunkSize = this.response.length;
		pCounter++;//yeni chunk indirildikten sonra buffer 1 arttırılıyor.

		if ( (pCounter - cCounter >= 2 ) & ( reBufStarted == true ) ){
			reBufStarted = false;//buffer'a 2 tane chunk yüklenmişse consumer tekrar başlatılıyor.
			reBufDuration = $.now() - reBufStarted;//Mevcut reBuffering siresi
			totalReBufTime += reBufDuration;// toplam rebuffering süresi
			reBufferNum++;	
			startConsumer();
			$('#reBuffering').append("<p> re-buffering duration & total reBuffering: " + reBufDuration + " --- "+ totalReBufTime + "</p>");
		} 

		if (pCounter >= 3 && consumer == false) {//After first 3 chunk downloaded consumer starts
			consumer = true;
			startConsumer();
			cStartT = $.now();//Consumer start time.
			startupDelay = cStartT - pStartT;//satartup delay'i hesapla
			$('#startupDelay').append("<p> Start-up Delay : " + startupDelay + "</p>");
		}
		throughput = (lastChunkSize*8) / (t2/1000); //converting to second - converting file size Byte to bit

		statistics[pCounter-1].pCounter = pCounter;//Records current statics
		statistics[pCounter-1].cCounter = cCounter;
		statistics[pCounter-1].t2 = t2;//chunk'ın indirilme süresi
		statistics[pCounter-1].throughput = throughput //bu chunk'ın indiirlme throughput'u
		statistics[pCounter-1].replevel = repLevel;
		statistics[pCounter-1].url = $($mpd).find('Representation[id = '+rep.eq(repLevel).attr('id')+'] > SegmentList > SegmentURL').eq(pCounter-1).attr('media');
		statistics[pCounter-1].size = lastChunkSize;
		
		$('#display').append("<p>" + statistics[pCounter-1].url + " --- " + (statistics[pCounter-1].size*8) +" bit" + " --- " + 
		statistics[pCounter-1].t2 + " ms" + " --- " + statistics[pCounter-1].throughput + " bps" + " --- " + statistics[pCounter-1].replevel +"</p>");
		//$('#display').append("<p>" + url + "</p>");
		
		console.log("pCounter : " + pCounter);
		checkBuffer();
	}else if ( xhr.readyState == 4 && xhr.status != 200 && pCounter < maxSegNum){
		//url = nextChunk();//gets the next chunks' URL
		//t1 = $.now();
		xhr.open('GET', url, true);
		xhr.send();
	}
}

function startConsumer(){
	if (cCounter == maxSegNum) {
		clearTimeout(setClearTime);//stop when last chunk is consumed.
	}else if ( (pCounter - cCounter > 0) & (reBufStarted == false) ){//buffer'da chunk varsa tüket
		cCounter++;
		setClearTime = window.setTimeout("startConsumer()",  chunkDuration*1000);//wait for play time duration of current chunk
	}
	else if ( (pCounter - cCounter  == 0) & (reBufStarted == false) ){
		reBufStartTime = $.now();//rebuffering starts
		reBufStarted = true;
		clearTimeout(setClearTime);//stop when buffer is empty.
	}
}

function nextChunk(){//calculates which chunk to be downloaded
	var segmentNextURL = $($mpd).find('Representation[id = '+rep.eq(repLevel).attr('id')+'] > SegmentList > SegmentURL').eq(pCounter).attr('media');
	var nextURL = baseURL + segmentNextURL;	
	//throughput = (lastChunkSize*8) / (t2/1000); //converting to second - converting file size Byte to bit
	if ( pCounter >= 3 ) {//if there is 4 chunks (including init chunk) at the beginning of Load, calculate next chucks' rep and return its URL		//Calculate nextLevel
		for(i = 0; i < rep.length ; i++){
			if ( (throughput >= bwList[repLevel+1]) & (repLevel < rep.length-1) ) {//if bw available increase quality level
				repLevel++;
			}else if( (throughput < bwList[repLevel]) & (repLevel > 0) ){
				repLevel--;			
			}					
		}
		segmentNextURL = $($mpd).find('Representation[id = '+rep.eq(repLevel).attr('id')+'] > SegmentList > SegmentURL').eq(pCounter).attr('media');
		return nextURL = baseURL + segmentNextURL;		
	}
	return nextURL;//First 3 chunk + 1 init will be Loaded from rep 0 and If there is no available bw.
}
