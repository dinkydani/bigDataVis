//on page load find all -> temp for testing
$.ajax({
	type: "GET",
	url: "/findAll",
	contentType: "application/json; charset=utf-8",
	success: function(data){
		console.log(data);
		$("#rawData").text(JSON.stringify(data));
	},
	error: function(error){
	}
});