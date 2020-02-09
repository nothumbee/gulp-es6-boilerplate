import $ from "jquery";

var map;

var basePath = $('body').data('base-path');

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 50.0755381, lng: 14.4378005},
        zoom: 15,
        disableDefaultUI: true
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (pos) {
            map.setCenter({lat: pos.coords.latitude, lng: pos.coords.longitude});
        });
    }
}

$(document).ready(function () {
    "use strict";

    var Filter = {};
    var defaultIcon = basePath + 'assets/frontend/images/Source/ss.png',
        activeIcon = basePath + 'assets/frontend/images/Source/ssactive.png',
        markers = [],
        servicesArr,
        branchesArr = [],
        request = null;

    loadMapData();
    fillFilterByUrl();

    $('#side-panel-close, #search-panel-close').click(function () {
        $('#map-info-content').hide('slide', {direction: 'left'});
    });

    $(".menu").click(function () {
        $(".navigation").show('slide', {direction: 'left'});
    });

    $(".close").click(function () {
        $(".navigation").hide('slide', {direction: 'left'})
    });

    $('#search').bind('enterKey', function () {
        searchMapItems($(this).val());
    });

    $('.map .box .filter').click(function () {
        searchMapItems($('#search').val());
    });

    $('#search').keyup(function (e) {
        if (e.keyCode == 13 && $(this).val() != "") {
            $(this).trigger('enterKey');
        }
    });

    $('body').on('click', '.order-item', function () {
        var branchId;
        var serviceId;
        if ($(this).data('id')){
            branchId = $(this).data('id');
            serviceId = $(this).data('service-id');
        } else {
            branchId = $(this).parent().prev().data('id');
            serviceId = $(this).parent().data('service-id');
        }

        var ServiceInfo = {};

        var BrancheInfo = {};

        $.ajax({
            method: "POST",
            url: basePath + 'api/get_branch_with_service_info',
            data: {
                serviceId: serviceId,
                branchId: branchId
            }
        }).done(function (data) {
            var cart = {};
            ServiceInfo.serviceId = data.service.id;
            ServiceInfo.name = data.service.name;
            ServiceInfo.description = data.service.description;
            ServiceInfo.servicePrice = data.service.price;

            BrancheInfo.brancheId = data.branch.id;
            BrancheInfo.userId = data.branch.user_id;
            BrancheInfo.brancheName = data.branch.name;
            BrancheInfo.brancheUrl = data.branch.url;
            $.ajax({
                method: "POST",
                url: basePath + 'cart/getCart'
            }).done(function (data) {
                cart = data;
                if (!$.isEmptyObject(cart)) {
                    if (cart.branche_id === BrancheInfo.brancheId && cart.branche_url === BrancheInfo.brancheUrl) {
                        addToCart(ServiceInfo, BrancheInfo);
                    } else {
                        $('#cart-popup #branch-name').html(cart.branche_url);
                        $.featherlight('#cart-popup', {});
                    }
                } else {
                    addToCart(ServiceInfo, BrancheInfo);
                }
            }).fail(function (err) {
                alert('Aktuálně není možné načíst košík');
            });
        }).fail(function (err) {
            alert('Aktuálně není možné přidat do košíku.');
        });
    });

    $('#search-panel').on('click', 'a.show-service', function () {
        toggleService($(this).data('id'));
    });

    $('#cart-popup #cancel-order').click(function(){
        cancelOrder();
    });

    function cancelOrder() {
        $.ajax({
            method: "POST",
            url: basePath + 'cart/clearCart'
        }).done(function (data) {
            $('.featherlight-content .featherlight-inner').html('Košík byl vyprázdněn. Nyní můžete pokračovat.');
        }).fail(function (err) {
            console.log(err);
            alert(err);
        });
    }

    function addToCart(ServiceInfo, BrancheInfo) {
        $.ajax({
            method: "POST",
            url: basePath + 'cart/addToCart',
            data: {
                serviceInfo: ServiceInfo,
                brancheInfo: BrancheInfo
            }
        }).done(function (data) {
            window.location.href = basePath + 'main/branche_order';
        }).fail(function (err) {
            alert('Aktuálně není možné přidat do košíku.');
        });
    }

    function toggleService(serviceId) {
        map.panTo(markers[serviceId].getPosition());
        setMarkersIcons(defaultIcon);
        markers[serviceId].setIcon(activeIcon);
        map.setZoom(15);
    }

    function searchMapItems(searchValue) {
        if (searchValue.length > 0) {
            if (!$('#map-info-content').is(':visible')) {
                $('#map-info-content').show('slide', {direction: 'left'});
            }
            $('#search-panel ul.search-list').empty();
            showSearchResults(searchValue);
        }
    }

    function loadMapData() {
        Filter.search = $('.search-input').val();
        Filter.pricefrom = $('.pricefrom-input').val();
        Filter.priceto = $('.priceto-input').val();
        Filter.arrange = $('.arrange-input').val();
        Filter.location = $('.arrange-location').val();

        $.ajax({
            method: "POST",
            url: basePath + "map/get_locations",
            data: Filter

        }).done(function (data) {
            placeMarkers(data);
        }).fail(function (err) {
            //ToDo: udělat flash message misto alertu
            console.log(err);
            alert("Data aktuálně není možné načíst, zkuste to prosím později.");
        });
    }

    function setMarkersIcons(icon) {
        markers.forEach(function (marker) {
            marker.setIcon(icon);
        });
    }

    function placeMarkers(branches) {
        branches.forEach(function (item) {
            var latlng = new google.maps.LatLng(parseFloat(item.lat), parseFloat(item.lng));
            var marker = new google.maps.Marker({
                position: latlng,
                map: map,
                icon: defaultIcon
            });
            markers[item.id] = marker;
            marker.addListener('click', function () {
                setMarkersIcons(defaultIcon);
                marker.setIcon(activeIcon);
                map.panTo(marker.getPosition());

                $('#info-tabs, #info-tabs-content').find('.cd-selected').removeClass('cd-selected');
                $('#info-tabs').find('li').first().find('a').addClass('cd-selected');
                $('#info-tabs-content').find('li').first().addClass('cd-selected');

                $('#map-info-content').show('slide', {direction: 'left'});

                showBranch(item.id);
                loadServices(item.id);
            });
        });
    }

    function showBranch(id) {
        $.ajax({
            method: "POST",
            url: basePath + "map/get_branch_info",
            data: {
                id: id
            },
            beforeSend: function () {
                showPanel('#search-panel', false, false);
                showPanel('#side-panel', false, true);
            }
        }).done(function (data) {
            console.log(data);
            if(data.length > 0){
                showPanel('#side-panel', true, false);
            } else{
                alert('Provozovnu se nepodařilo najít.');
            }
            fillBranchInfo(data[0]);
        }).fail(function (err) {
            //ToDo: udělat flash message misto alertu
            console.log(err);
            alert("Data aktuálně není možné načíst, zkuste to prosím později.");
        });
    }

    function showSearchResults(searched_string) {
        var Filter = {};

        Filter.searched_string = searched_string;

        $.ajax({
            method: "POST",
            url: basePath + "api/filter_services_by_name/",
            data: {
                filter: Filter
            },
            beforeSend: function () {
                showPanel('#side-panel', false, false);
                showPanel('#search-panel', true, true);
            }
        }).done(function (data) {
            console.log(data);
            window.history.replaceState("object or string", "Mapa - Filrtování", buildFilterUrl(Filter));
            if (data.length > 0) {
                $.each(data, function (i, item) {
                    $('#search-panel .search-list').append(
                        '<li>' +
                        '<a href="javascript:void(0)" data-id="' + item.id + '" class="show-service">' +
                        '<img src="' + basePath + 'uploads/' + item.logo + '" alt="logo">' +
                        '<p>' + item.name + '</p>' +
                        '<p class="no-wrap">' + item.price + ',- Kč</p>' +
                        '</a>' +
                        '<div class="service-buttons" data-service-id="' + item.service_id + '">' +
                        '<a href="javascript:void(0)" class="btn order-item">Objednat</a>' +
                        '<a href="' + basePath + '/servis/' + item.url + '" class="btn">Přejít na servis</a>' +
                        '</div>' +
                        '</li>'
                    );
                });
            } else {
                $('#search-panel .search-list').append('<li><p>Na zadaný výraz nebyly nalezeny žádné služby.</p></li>');
            }
            $('#search-panel-loading').hide();
        }).fail(function (err) {
            console.log(err);
            alert("Data aktuálně není možné načíst, zkuste to prosím později.");
        });
    }

    function loadServices(branch_id) {
        $.ajax({
            method: "POST",
            url: basePath + "api/get_services_by_branch",
            data: {
                branch_id: branch_id
            },
            beforeSend: function () {

            }
        }).done(function (data) {
            console.log(data);
            $('#branch-services').empty();
            if (data.length > 0) {
                $.each(data, function (i, item) {
                    $('#branch-services').append('<tr><td class="width-service">' + item.name + '</td><td class="service-buttons no-wrap btn order-item" data-id="'+item.branches_id+'" data-service-id="'+item.service_id+'">' + item.price + ' Kč</td></tr>');
                });
            } else {
                $('#branch-services').append('<tr><td style="text-align: center;">Autoservis prozatím neposkytuje žádné služby.</td></tr>');
            }
        }).fail(function (a) {
            console.log(a);
        });
    }

    function showPanel(selector, visible, loading) {
        if (visible) {
            $(selector).show();
        } else {
            $(selector).hide();
        }
        if (loading) {
            $(selector + '-loading').show();
        } else {
            $(selector + '-loading').hide();
        }
    }

    function fillBranchInfo(data) {
        var date = new Date();
        var openHoursHtml = "Dnes otevřeno: ";

        $('#branch-name').html('<a href="' + basePath + 'servis/' + data.url + '">' + data.name + '</a>');
        $('#branch-location').html(data.address);
        $('#total-orders').html(data.total_ratings);
        $('#done-orders').html(data.decided_orders);
        $('#go-to-branch').attr('href', basePath + 'servis/' + data.url);
        $('.stars').attr('style', '--rating: ' + (data.average_rating === null ? 0 : data.average_rating));
        for (var i = 1; i < 6; i++) {
            $('#' + i + '-rating-progress').animate({width: parseInt(200 * (data['rating_' + i] / data.total_ratings)) || 0}, {
                duration: 200,
                queue: false
            });
        }
         var today = 'day_'+date.getDay()+ '_';
        if(data[today + 'from'] === null){
            $('#open-hours').hide();
        } else if(!$('#open-hours').is(':visible')){
            $('#open-hours').show();
        }
        if (data[today+'locked'] !== 1){
            openHoursHtml += data[today + 'from'] + ' - ' + data[today + 'to'];
        } else {
            openHoursHtml = "Dnes zavřeno";
        }
        $('#open-hours').html(openHoursHtml);
        if (data.branch_image !== 'undefined' && data.branch_image !== null) {
            $('#branch-image').css('background-image', 'url(' + $('#branch-image').data('base-url') + 'uploads/' + data.branch_image + ')');
        } else {
            $('#branch-image').css('background-image', 'url(' + $('#branch-image').data('base-url') + 'assets/frontend/images/notfound.png');
        }
    }

    function fillFilterByUrl() {
        var Filter = {};

        Filter.searched_string = getUrlParameter('searched_string');

        if (Filter.searched_string != "" && typeof(Filter.searched_string) != "undefined") {
            $('input#search').val(Filter.searched_string);
            searchMapItems(Filter.searched_string);
        }
    }

    function buildFilterUrl(filter) {
        var url = basePath + "map?";
        for (var propName in filter) {
            if (filter[propName].length > 0 || filter[propName] != "") {
                url += propName + "=" + filter[propName] + "&";
            }
        }
        return url;
    }

    function getUrlParameter(sParam) {
        var sPageURL = window.location.search.substring(1),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
            }
        }
    }
});