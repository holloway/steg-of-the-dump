(function($){
	"use strict";

	var $encode_tweet, $encode_secret, $encode_result, $tweet_length, $encode_result_status, $hidden_length, $hidden_message_length,
		$decode_tweet, $decode_secret,
		maxlength = 140,

		init = function(){
			$encode_tweet  = $("#encode_tweet") .keyup(encode_update).keypress(encode_update).change(encode_update);
			$encode_secret = $("#encode_secret").keyup(encode_secret_update).keypress(encode_update).change(encode_update).blur(set_to_lowercase);
			$encode_result = $("#encode_result").focus(only_allow_selection);
			$decode_tweet  = $("#decode_tweet") .keyup(decode_update).change(decode_update);
			$decode_secret = $("#decode_secret").focus(only_allow_selection);
			$tweet_length  = $("#tweet_length");
			$hidden_length = $("#hidden_length");
			$hidden_message_length = $("#hidden_message_length");
			$encode_result_status = $("#encode_result_status");
			secret_alphabet_bitlength = secret_alphabet.length.toString(2).length;
			update_homoglyph_lookup();
			encode_update();
			$decode_tweet.val($encode_result.val());
			decode_update();

			$("#valid_hidden_message_characters").text(secret_alphabet_string);
			$(".secret_alphabet_bitlength").text(secret_alphabet_bitlength);
		},
		encode_tweet_update = function(){
			encode_update();
		},
		encode_secret_update = function(event){
			var character_code = event.which,
				character      = String.fromCharCode(character_code).toLowerCase();

			if(secret_alphabet.indexOf(character) === -1 && editing_keys.indexOf(character_code) === -1) {
				event.preventDefault();
				return;
			}
			encode_update();
		},
		encode_update = function(){
			var tweet = $encode_tweet.val(),
				secret = $encode_secret.val().toLowerCase() + " ",
				secret_binary = "",
				character,
				character_code_in_decimal,
				character_code_in_hexadecimal,
				secret_alphabet_index,
				secret_character_binary,
				result = "",
				homoglyph,
				homoglyph_options,
				homoglyph_options_bitlength,
				secret_binary_to_encode,
				secret_binary_to_encode_in_decimal,
				tweet_covertext_chars = 0,
				i;

			//if(tweet.length < maxlength && maxlength - tweet.length > 0) {
			//	tweet += new Array(maxlength - tweet.length).join(" ");
			//}

			for(i = 0; i < secret.length; i++){
				character = secret[i];
				secret_alphabet_index = secret_alphabet.indexOf(character);
				if(secret_alphabet_index >= 0) {
					secret_character_binary = zeropad(secret_alphabet_index.toString(2), secret_alphabet_bitlength);
					if(secret_character_binary.length !== secret_alphabet_bitlength) {
						console.log("ERROR: binary representation of character too big!", secret_alphabet_index.toString(2), " zeropadded to ", zeropad(secret_alphabet_index.toString(2), secret_alphabet_bitlength));
					}
					secret_binary += secret_character_binary;
				} else {
					console.log("ERROR: secret contains invalid character '" + character + "' Ignored.");
				}
			}

			secret_binary = ensure_secret_binary_divisible_by_alphabet_bitlength(secret_binary);
			
			for(i = 0; i < tweet.length; i++){
				character = tweet[i];
				homoglyph = homoglyphs[character];
				if(homoglyph !== undefined){
					homoglyph_options = homoglyph.slice(0);
					homoglyph_options_bitlength = (homoglyph_options.length + 1).toString(2).length - 1;
					tweet_covertext_chars += homoglyph_options_bitlength;
					if(secret_binary.length > 0){
						secret_binary_to_encode = secret_binary.substr(0, homoglyph_options_bitlength);
						//if(secret_binary_to_encode.length < secret_alphabet_bitlength) {
						//	secret_binary_to_encode = zeropad(secret_binary_to_encode, secret_alphabet_bitlength);
						//}
						secret_binary = secret_binary.substr(homoglyph_options_bitlength);	
						secret_binary_to_encode_in_decimal = parseInt(secret_binary_to_encode, 2);
						if(secret_binary_to_encode_in_decimal > 0) {
							character_code_in_hexadecimal = homoglyph_options[secret_binary_to_encode_in_decimal - 1];
							character_code_in_decimal = parseInt(character_code_in_hexadecimal, 16);
							character = String.fromCharCode(character_code_in_decimal);
						}
						//console.log("Encoding ", secret_binary_to_encode, " by making ", tweet[i], "(" + tweet.charCodeAt(i) + ") into ", character + " (" + character.charCodeAt(0) + ").", homoglyph_options);
					}
				}
				result += character;
			}

			if(secret_binary.length > 0) {
				$encode_result.parent().addClass("unable-to-cover-text");
				$encode_result_status.show();
			} else {
				$encode_result.parent().removeClass("unable-to-cover-text");
				$encode_result_status.hide();
			}
			$encode_result.val(result);
			$decode_tweet.val(result);
			$tweet_length.text(" (length: " + result.length + ")");
			$hidden_message_length.text(" (length: " + secret.length + ")")
			$hidden_length.text(" (allows Hidden Message length " + Math.ceil(tweet_covertext_chars / secret_alphabet_bitlength) + ")");
			decode_update();
		},
		ensure_secret_binary_divisible_by_alphabet_bitlength = function(secret_binary){
			if(secret_binary % secret_alphabet_bitlength > 0) {
				secret_binary += zeropad("0", secret_alphabet_bitlength - (secret_binary % secret_alphabet_bitlength));
			}
			return secret_binary;
		},
		set_to_lowercase = function(){
			$(this).val($(this).val().toLowerCase());
		},
		only_allow_selection = function(){
			var $this = $(this);

			$this.select();
			$this.mouseup(function() {
				$this.unbind("mouseup");
				return false;
			});
		},
		decode_update = function(){
			var tweet = $decode_tweet.val(),
				character,
				character_code,
				secret_binary = "",
				secret_character_in_binary,
				secret_character_in_decimal,
				secret_character,
				result = "",
				i;

			//console.log(homoglyphs_lookup);
			for(i = 0; i < tweet.length; i++){
				character = tweet.substr(i, 1);
				if(homoglyphs_lookup[character]) {
					secret_binary += homoglyphs_lookup[character];
				}
			}

			secret_binary = ensure_secret_binary_divisible_by_alphabet_bitlength(secret_binary);


			//console.log(secret_binary);

			while(secret_binary.length > 0){
				secret_character_in_binary = secret_binary.substr(0, secret_alphabet_bitlength);
				if(secret_character_in_binary.length > 0) {
					secret_character_in_binary = zeropad(secret_character_in_binary, secret_alphabet_bitlength);
					if(secret_character_in_binary.length !== secret_alphabet_bitlength) {
						console.log("ERROR: Unable to extract 5 characters (zeropadded) from string. ", secret_binary.substr(i, secret_alphabet_bitlength), zeropad(secret_binary.substr(i, secret_alphabet_bitlength), secret_alphabet_bitlength));
					}
					secret_character_in_decimal = parseInt(secret_character_in_binary, 2);
					if(secret_alphabet[secret_character_in_decimal]) {
						result += secret_alphabet[secret_character_in_decimal];
					} else {
						//console.log("ERROR: Unable to find secret alphabet character at position", secret_character_in_decimal);
					}
				}
				secret_binary = secret_binary.substr(secret_alphabet_bitlength);
			}

			$decode_secret.val(result);
		},
		zeropad = function(value, length){
			return (new Array(length).join("0") + value).substr(-length, length);
		},
		editing_keys = [8, 46], // backspace, delete etc
		secret_alphabet_string = " abcdefghijklmnopqrstuvwxyz123456789'0.:/\\%-_?&;",
		secret_alphabet = secret_alphabet_string.split(""),
		secret_alphabet_bitlength,
		homoglyphs_lookup,
		update_homoglyph_lookup = function(){
			homoglyphs_lookup = {};

			$.each(homoglyphs, function(character, homoglyph_options){
				var i,
					homoglyph_option,
					homoglyph_option_character,
					homoglyph_options_bitlength;

				homoglyph_options_bitlength = (homoglyph_options.length + 1).toString(2).length - 1;

				homoglyphs_lookup[character] = zeropad("0", homoglyph_options_bitlength);

				for(i = 0; i < homoglyph_options.length; i++){
					homoglyph_option = homoglyph_options[i];
					homoglyph_option_character = String.fromCharCode(parseInt(homoglyph_option, 16));
					homoglyphs_lookup[homoglyph_option_character] = zeropad((i + 1).toString(2), homoglyph_options_bitlength);
				}
			});
		},
		homoglyphs = {
			"!":["FF01"],
			'"':["FF02"],
			"$":["FF04"],
			"%":["FF05"],
			"&":["FF06"],
			"'":["FF07"],
			"(":["FF08"],
			")":["FF09"],
			"*":["FF0A"],
			"+":["FF0B"],
			",":["FF0C"],
			"-":["FF0D"],
			".":["FF0E"],
			"/":["FF0F"],
			"0":["FF10"],
			"1":["FF11"],
			"2":["FF12"],
			"3":["FF13"],
			"4":["FF14"],
			"5":["FF15"],
			"6":["FF16"],
			"7":["FF17"],
			"8":["FF18"],
			"9":["FF19"],
			":":["FF1A"],
			";":["FF1B"],
			"<":["FF1C"],
			"=":["FF1D"],
			">":["FF1E"],
			"?":["FF1F"],
			"@":["FF20"],
			"A":["FF21","0391","0410"],
			"B":["FF22","0392","0412"],
			"C":["FF23","03F9","216D"],
			"D":["FF24"],
			"E":["FF25","0395","0415"],
			"F":["FF26"],
			"G":["FF27"],
			"H":["FF28","0397","041D"],
			"I":["FF29","0399","0406"],
			"J":["FF2A"],
			"K":["FF2B","039A","212A"],
			"L":["FF2C"],
			"M":["FF2D","039C","041C"],
			"N":["FF2E"],
			"O":["FF2F","039F","041E"],
			"P":["FF30","03A1","0420"],
			"Q":["FF31"],
			"R":["FF32"],
			"S":["FF33"],
			"T":["FF34","03A4","0422"],
			"U":["FF35"],
			"V":["FF36","0474","2164"],
			"W":["FF37"],
			"X":["FF38","03A7","2169"],
			"Y":["FF39","03A5","04AE"],
			"Z":["FF3A"],
			"[":["FF3B"],
			"\\":["FF3C"],
			"]":["FF3D"],
			"^":["FF3E"],
			"_":["FF3F"],
			"`":["FF40"],
			"a":["FF41"],
			"b":["FF42"],
			"c":["FF43","03F2","0441"],
			"d":["FF44"],
			"e":["FF45"],
			"f":["FF46"],
			"g":["FF47"],
			"h":["FF48"],
			"i":["FF49","0456","2170"],
			"j":["FF4A"],
			"k":["FF4B"],
			"l":["FF4C"],
			"m":["FF4D"],
			"n":["FF4E"],
			"o":["FF4F","03BF","043E"],
			"p":["FF50"],
			"q":["FF51"],
			"r":["FF52"],
			"s":["FF53"],
			"t":["FF54"],
			"u":["FF55"],
			"v":["FF56","03BD","2174"],
			"w":["FF57"],
			"x":["FF58","0445","2179"],
			"y":["FF59"],
			"z":["FF5A"],
			"{":["FF5B"],
			"|":["FF5C"],
			"}":["FF5D"],
			"~":["FF5E"],
			" ":["2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","200A","2028","2029","202F","205F"]
		};

	$(document).ready(init);
}(jQuery));